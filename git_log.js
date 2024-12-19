import { default as gitee } from './gitee.js'
import { default as inquirer } from 'inquirer'
import { default as fs } from 'fs'
import { default as path } from 'path'
import ora from 'ora'

import utils from './utils.js'

let userInfo
let startDate = null
let endDate = null
let access_token = ''
let authors = new Map() //提交的用户列表
let repos = new Set() //仓库列表
let result = {}
let cache_config = getConfig()
function init() {
	return inquirer.prompt({
		message: '请输入用户授权码:',
		type: 'input',
		name: 'access_token',
		mask: '*', // 隐藏输入
		default: cache_config.access_token,
		validate: async (value) => {
			if (!value) {
				return '授权码不能为空'
			}
			gitee.init(value)
			try {
				const userInfo = await gitee.getUserInfo()
				if (userInfo.message) {
					return userInfo.message
				}
				this.userInfo = userInfo
				access_token = value
				return true
			} catch (error) {
				return error.message
			}
		},
	})
}

function setDateRange() {
	return inquirer
		.prompt({
			type: 'list',
			message: '请选择日期范围',
			choices: ['年报', '月报', '自定义'],
			name: 'date_range',
			default: '年报',
		})
		.then((answer) => {
			switch (answer.date_range) {
				case '年报':
					return setYear()
				case '月报':
					return setYear().then(() => {
						return setMonth()
					})
				default:
					return setStartDate().then(() => {
						return setEndDate()
					})
			}
		})
}

function setYear() {
	return inquirer.prompt({
		message: '请输入年份:',
		type: 'number',
		name: 'year',
		default: new Date().getFullYear(),
		validate: (value) => {
			if (!value) {
				startDate = new Date(new Date().getFullYear(), 0, 1)
				endDate = new Date(new Date().getFullYear(), 11, 31)
				return true
			}
			if (value < 1970 || value > 2100) {
				return '年份范围错误'
			}
			startDate = new Date(value, 0, 1)
			endDate = new Date(value, 11, 31)
			return true
		},
	})
}

function setMonth() {
	return inquirer.prompt({
		message: '请输入月份:',
		type: 'number',
		name: 'month',
		default: new Date().getMonth() + 1,
		validate: (value) => {
			if (!value) {
				startDate = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
				endDate = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0)
				return true
			}
			if (value < 1 || value > 12) {
				return '月份范围错误'
			}
			startDate.setMonth(value - 1)
			startDate.setDate(1)
			return true
		},
	})
}

function setStartDate() {
	return inquirer.prompt({
		message: '请输入开始日期(可省略,格式:yyyy-mm-dd):',
		type: 'input',
		name: 'start_date',
		validate: (value) => {
			if (!value) {
				startDate = null
				return true
			}
			let date = new Date(value)
			if (date.toString() === 'Invalid Date') {
				startDate = null
				return '日期格式错误'
			}
			startDate = date
			return true
		},
	})
}

function setEndDate() {
	return inquirer.prompt({
		message: '请输入开始日期(可省略,格式:yyyy-mm-dd):',
		type: 'input',
		name: 'end_date',
		validate: (value) => {
			if (!value) {
				endDate = null
				return true
			}
			let date = new Date(value)
			if (date.toString() === 'Invalid Date') {
				endDate = null
				return '日期格式错误'
			}
			endDate = date.addDays(1)
			return true
		},
	})
}

function getEvents(limit = 20) {
	return new Promise(async (resolve, reject) => {
		let pageCount = 0
		let prev_id = null
		authors = new Map()
		repos = new Set()
		const spinner = ora('开始获取数据...').start()

		while (true) {
			pageCount++
			spinner.text = `正在分析第 ${pageCount} 页数据...`
			let data
			try {
				data = await gitee.getEvents(this.userInfo.login, limit, prev_id)
				if(data.message){
					spinner.fail(data.message)
					reject(data.message)
					return
				}
			} catch (error) {
				spinner.fail(`获取第 ${pageCount} 页数据失败,` + error.message)
				reject(error)
				return
			}
			if (data.length === 0) {
				spinner.succeed('全部数据获取完毕')
				resolve(result)
				return
			}
			prev_id = data[data.length - 1].id
			for (let index = 0; index < data.length; index++) {
				const element = data[index]
				if (element.type != 'PushEvent') {
					continue
				}
				if (!result[element.repo.full_name]) {
					result[element.repo.full_name] = []
				}
				if (endDate != null && new Date(element.created_at) > endDate) {
					continue
				}
				if (startDate != null && new Date(element.created_at) < startDate) {
					spinner.succeed('已获取到指定日期范围内的数据')
					resolve(result)
					return
				}
				element.payload.commits.forEach((commit) => {
					if (!commit.message.startsWith('Merge ')) {
						repos.add(element.repo.full_name)
						result[element.repo.full_name].push(commit)
						const authorKey = commit.author.name + '<' + commit.author.email + '>'
						if (!authors.has(authorKey)) {
							authors.set(authorKey, commit.author)
						}
					}
				})
			}
		}
	})
}

//过滤仓库和用户
function setFilter() {
	let choices_emails = []
	authors.forEach((value, key) => {
		choices_emails.push({ name: key, value: value.email, checked: cache_config.emails.includes(value.email) })
	})

	let choices_repos = []
	repos.forEach((value) => {
		choices_repos.push({ name: value, value: value, checked: cache_config.repos.includes(value) })
	})
	return inquirer.prompt([
		{
			type: 'checkbox',
			message: '选择提交仓库',
			choices: choices_repos,
			name: 'repos',
			validate: (value) => {
				if (value.length === 0) {
					return '至少选择一个仓库'
				}
				return true
			},
		},
		{
			type: 'checkbox',
			message: '选择提交用户',
			choices: choices_emails,
			name: 'emails',
			default: choices_emails.map((item) => item.value),
			validate: (value) => {
				if (value.length === 0) {
					return '至少选择一个用户'
				}
				return true
			},
		},
	])
}
function getConfig() {
	let config = utils.read_cache('config')
	if (config == null) {
		return {
			access_token: '',
			emails: [],
			repos: [],
		}
	}
	return config
}
function saveConfig(config) {
	cache_config.repos.forEach((value) => {
		if (!repos.has(value) && !config.repos.includes(value)) {
			config.repos.push(value)
		}
	})
	const authors_temp = new Set()
	authors.forEach((value, key) => {
		authors_temp.add(value.email)
	})
	cache_config.emails.forEach((value) => {
		if (!authors_temp.has(value) && !config.emails.includes(emavalueil)) {
			config.emails.push(value)
		}
	})
	config.access_token = access_token
	utils.save_cache('config', config)
}
//保存结果
async function saveResult() {
	let save_filter = await setFilter()
	let str = ''
	for (const key in result) {
		if (!save_filter.repos.includes(key)) {
			continue
		}
		str += `## ${key}\n\n`
		result[key].forEach((commit) => {
			if (!save_filter.emails.includes(commit.author.email)) {
				return
			}
			str += `- ${commit.message.trim()}\n`
		})
		str += `\n`
	}
	const save_file=path.resolve(process.cwd(), 'git_log.md')
	fs.writeFileSync(save_file, str)
	saveConfig(save_filter)
	console.log('保存成功: '+save_file)
}

export default {
	init,
	userInfo,
	startDate,
	endDate,
	setDateRange,
	getEvents,
	saveResult,
}
