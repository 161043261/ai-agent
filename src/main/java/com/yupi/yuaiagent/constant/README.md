# Constant 常量模块

## 模块概述

存放项目全局常量定义;

## 文件清单

| 文件                | 接口名       | 功能         |
| ------------------- | ------------ | ------------ |
| `FileConstant.java` | FileConstant | 文件相关常量 |

## FileConstant

```java
public interface FileConstant {
    /**
     * 文件保存目录
     * 值：{项目根目录}/tmp
     */
    String FILE_SAVE_DIR = System.getProperty("user.dir") + "/tmp";
}
```

### 使用场景

- ChatMemory 对话记录存储
- 工具生成的临时文件
- 下载的资源文件
