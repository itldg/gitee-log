#!/usr/bin/env node
'use strict'
import { default as gitLog } from './git_log.js'
gitLog
	.init()
	.then(() => gitLog.setDateRange())
	.then(() => gitLog.getEvents())
	.then(() => gitLog.saveResult())
	.catch((error) => {
		if (error instanceof Error && error.name === 'ExitPromptError') {
			console.log('👋 用户退出,拜拜!')
		} else {
			console.error(error)
		}
	}).finally(() => {
		process.exit(1)
	})
