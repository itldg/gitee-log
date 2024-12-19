import { default as utils } from './utils.js'
const API = 'https://gitee.com/api/v5'
// 私人令牌
let _access_token = ''
function init(access_token) {
	_access_token = access_token
}

/**
 * 获取用户信息
 * @return {*}
 */
function getUserInfo() {
	return utils.getJson(`${API}/user?access_token=${_access_token}`)
}
/**
 * 列出用户的动态
 * @param {*} username 用户名
 * @param {*} limit 滚动列表每页的数量，最大为 100
 * @param {*} prev_id 滚动列表的最后一条记录的id
 * @return {*}
 */
function getEvents(username, limit = 20, prev_id = null) {
	let url = `https://gitee.com/api/v5/users/${username}/events?access_token=${_access_token}&limit=${limit}`
	if (prev_id) {
		url += `&prev_id=${prev_id}`
	}
	return utils.getJson(url)
}
export default {
	init,
	getUserInfo,
	getEvents,
}
