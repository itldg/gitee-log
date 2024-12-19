import { default as https } from 'https'
import { default as fs } from 'fs'
import { default as path } from 'path'

const __dirname = path.resolve()

/**
 * 发起GET请求
 * @param {*} url 要请求的地址
 * @return {Promise}
 */
function httpGet(url) {
	return new Promise((resolve, reject) => {
		https
			.get(url, (res) => {
				let html = ''
				res.on('data', (chunk) => {
					html += chunk
				})
				res.on('end', () => {
					resolve(html)
				})
			})
			.on('error', (e) => {
				reject(e)
			})
	})
}

/**
 * 请求JSON
 * @param {*} url 要请求的地址
 * @return {Promise}
 */
function getJson(url) {
	return httpGet(url).then((res) => {
		return JSON.parse(res)
	})
}

/**
 * 设置缓存
 * @param {string} key 键名
 * @param {object} value 值
 */
function save_cache(key, value) {
	fs.writeFileSync(path.resolve(__dirname, key), JSON.stringify(value), 'utf8')
}

/**
 * 读取缓存
 * @param {String} key 键名
 * @return {Object | null} 返回缓存对象或null
 */
function read_cache(key) {
	const cache_path = path.resolve(__dirname, key)
	if (!fs.existsSync(cache_path)) {
		return null
	}
	return JSON.parse(fs.readFileSync(cache_path, 'utf8'))
}

export default {
	__dirname,
	httpGet,
	getJson,
	save_cache,
	read_cache,
}
