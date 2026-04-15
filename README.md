# AI Agent

## Knex 快速入门

以下示例基于本项目的后端结构，快速展示如何在 Service/DAO 层使用 Knex：

### 1) 建立连接与初始化流程

本项目的 Knex 初始化入口在 [mysql.ts](file:///Users/bytedance/github/ai-agent/server/src/db/mysql.ts)。应用启动时会调用 `initMysql()` 建立连接池并做连通性测试（`SELECT 1`），随后按需创建基础表结构。

在业务代码中不要自行 `knex()` 创建新连接池，而是通过 `getDb()` 获取全局复用的连接实例。

#### 获取数据库连接：

```ts
import { getDb } from "./src/db/mysql";

const db = getDb();
```

### 2) 查询（Query）示例

#### 单条查询（first）：

```ts
const user = await db("users")
  .where({ username: "demo" })
  .whereNull("deleted_at")
  .first();
```

#### 多条件查询 / 排序 / 限制：

```ts
const sessions = await db("sessions")
  .where({ username: "demo" })
  .whereNull("deleted_at")
  .orderBy("created_at", "desc")
  .limit(20);
```

#### 分页（offset/limit）：

```ts
const page = 1;
const pageSize = 20;

const rows = await db("messages")
  .where({ session_id: "session-id" })
  .orderBy("created_at", "asc")
  .offset((page - 1) * pageSize)
  .limit(pageSize);

const [{ total }] = await db("messages")
  .where({ session_id: "session-id" })
  .count<{ total: number }>({ total: "*" });
```

### 3) 插入（Insert）示例

```ts
await db("sessions").insert({
  id: "session-id",
  username: "demo",
  title: "Hello",
});
```

#### 插入并返回（MySQL 常用写法）：

```ts
const [id] = await db("users").insert({
  username: "demo",
  email: "demo@example.com",
  password: "hashed",
});
```

### 4) 更新（Update）示例

```ts
await db("users").where({ id: 1 }).update({ name: "new-name" });
```

#### 软删除（soft delete）示例：

```ts
await db("sessions")
  .where({ id: "session-id" })
  .update({ deleted_at: new Date() });
```

### 5) 联表（Join）示例

当需要展示会话及其最后一条消息等“组合视图”时，使用联表查询能减少往返次数：

```ts
const rows = await db("sessions as s")
  .leftJoin("messages as m", "m.session_id", "s.id")
  .select("s.id", "s.username", "s.title", "m.content as last_message")
  .where("s.username", "demo")
  .whereNull("s.deleted_at")
  .orderBy("m.created_at", "desc")
  .limit(20);
```

### 6) 事务（Transaction）示例

在需要“写入多张表且必须原子性一致”的场景下使用事务。以下示例展示了创建会话并写入首条消息的原子提交：

```ts
await db.transaction(async (trx) => {
  await trx("sessions").insert({
    id: "session-id",
    username: "demo",
    title: "Hello",
  });
  await trx("messages").insert({
    session_id: "session-id",
    username: "demo",
    content: "hi",
    is_user: true,
  });
});
```

#### 事务隔离级别（Transaction Isolation）

Knex 的事务隔离级别由底层数据库决定。MySQL 常见隔离级别包括 `READ COMMITTED`、`REPEATABLE READ` 等。项目中如果需要针对单个事务设置隔离级别，可以在事务开始后执行 `SET TRANSACTION ISOLATION LEVEL ...`：

```ts
await db.transaction(async (trx) => {
  await trx.raw("SET TRANSACTION ISOLATION LEVEL READ COMMITTED");
  // ... 业务读写
});
```

### 7) 常见最佳实践

- 在 DAO 层封装表访问：例如 `dao/user.ts` 将 `db()<User>(\"users\")` 抽象为 `users()`，便于复用与类型约束。
- 明确排序字段：历史消息查询统一按 `created_at` 排序，避免分页/增量拉取出现不稳定顺序。
- 避免 N+1 查询：需要组合视图时优先使用 Join 或一次性批量查询再在内存中合并。

## 原人.md

```md
# 原人

原人是由哈基米自研的一款开放世界冒险 RPG。你将在游戏中探索一个被称作瓦特乐的幻想世界。在这广阔的世界中，你可以踏遍七国，邂逅性格各异、能力独特的同伴，与他们一同对抗强敌，踏上寻回血亲之路；也可以不带目的地漫游，沉浸在充满生机的世界里，让好奇心驱使自己发掘各个角落的奥秘……直到你与分离的血亲重聚，在终点见证一切事物的沉淀
```

## 哈基米.md

```md
# 哈基米（也称为马哈鱼）

哈基米，也称为马哈鱼，成立于 2020 年，致力于为用户提供美好的、超出预期的产品与内容。哈基米多年来秉持技术自主创新，坚持走原创精品之路，围绕原创 IP 打造了涵盖漫画、动画、游戏、音乐、小说及动漫周边的全产业链
```
