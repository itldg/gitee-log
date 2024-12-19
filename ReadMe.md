# Gitee 日志输出

![界面预览](./preview.png)

## 使用方法

输入 `gitee-log` 命令，按照提示输入信息即可。

执行完毕后会在执行目录下生成 `gitee-log.md` 文件，内容为日志信息。

## 辅助配置

自定义仓库名称,手动创建`C:\Users\你的用户名\gitee_log_alias`, 内容如下：

```json
{
	"itldg/gitee-log": "Gitee 日志",
	"itldg/utools-suspension-text": "悬浮文本"
}
```

## 引用包

-   `ora` 用于在控制台输出加载动画
-   `inquirer` 用于在控制台输出交互式问题
