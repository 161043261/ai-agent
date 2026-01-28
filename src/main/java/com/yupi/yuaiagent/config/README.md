# Config 配置模块

## 模块概述

Config 模块包含全局配置类, 当前主要处理跨域配置;

## 文件清单

| 文件              | 类名       | 功能     |
| ----------------- | ---------- | -------- |
| `CorsConfig.java` | CorsConfig | 跨域配置 |

## CorsConfig 详解

```java
@Configuration
public class CorsConfig implements WebMvcConfigurer {

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/**")
            .allowCredentials(true)
            .allowedOriginPatterns("*")
            .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
            .allowedHeaders("*")
            .exposedHeaders("*");
    }
}
```

### 配置说明

| 配置项                | 值    | 说明               |
| --------------------- | ----- | ------------------ |
| addMapping            | `/**` | 匹配所有路径       |
| allowCredentials      | true  | 允许携带凭证       |
| allowedOriginPatterns | `*`   | 允许所有来源       |
| allowedMethods        | 全部  | 允许所有 HTTP 方法 |
| allowedHeaders        | `*`   | 允许所有请求头     |
| exposedHeaders        | `*`   | 暴露所有响应头     |

### 安全建议

生产环境建议限制 `allowedOriginPatterns`：

```java
registry.addMapping("/**")
    .allowedOriginPatterns(
        "https://yourdomain.com",
        "https://api.yourdomain.com"
    );
```
