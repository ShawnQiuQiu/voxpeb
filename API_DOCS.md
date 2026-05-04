# Voxpeb 硬件设备数据同步接口文档 (API Documentation)

Voxpeb 使用 Supabase 作为后端服务。硬件设备或客户端向云端同步 TOEFL 练习录音和评估结果时，可以通过调用 Supabase 提供的标准 REST API 实现。

## 1. 基础信息

- **Base URL (Endpoint)**: `https://<YOUR_SUPABASE_PROJECT_ID>.supabase.co/rest/v1`
- **请求格式**: `application/json`
- **鉴权方式**: 
  需要在 HTTP Header 中提供以下两个字段：
  - `apikey`: 你的 Supabase `anon_key` 或者 `service_role_key`
  - `Authorization`: `Bearer <用户_ACCESS_TOKEN>` (如果设备能获取到用户登录Token)，或者使用设备的专属 service key。

---

## 2. 接口列表

### 2.1 上传 TOEFL 练习会话 (Upload TOEFL Session)

将设备评测完成的单次托福口语成绩同步到云端。

- **URL**: `/toefl_sessions`
- **Method**: `POST`
- **Headers**:
  ```http
  apikey: <SUPABASE_ANON_KEY>
  Authorization: Bearer <USER_ACCESS_TOKEN>
  Content-Type: application/json
  Prefer: return=representation
  ```

- **Body (JSON)**:
  ```json
  {
    "user_id": "uuid-of-the-user",
    "date": "2026-03-20T14:30:00Z",
    "task_type": "Independent", 
    "duration_minutes": 15.5,
    "overall_score": 28,
    "delivery_score": 4.0,
    "language_use_score": 3.5,
    "topic_development_score": 4.0,
    "feedback": "Outstanding performance! You answered the prompt clearly and fluently.",
    "transcript": "If I had to choose between living in a city or the countryside..."
  }
  ```

**字段说明**:
| 字段名 | 类型 | 必填 | 限制 | 描述 |
| --- | --- | --- | --- | --- |
| `user_id` | `UUID` | 是 | 需要是有效的 Supabase Auth User ID | 该条记录所属的用户ID |
| `date` | `String (ISO 8601)` | 是 | | 练习发生的时间，如 `2026-04-24T08:00:00Z` |
| `task_type` | `String` | 是 | 必须为 `Independent` 或 `Integrated` | 托福口语题目类型（独立/综合） |
| `duration_minutes` | `Number (Float)`| 是 | | 练习或录音的总时长（分钟） |
| `overall_score` | `Integer` | 是 | `0` 到 `30` | 托福口语综合总分 |
| `delivery_score` | `Number (Float)`| 是 | `0` 到 `4.0` | Delivery（表达传递）单项得分 |
| `language_use_score` | `Number (Float)`| 是 | `0` 到 `4.0` | Language Use（语言使用）单项得分 |
| `topic_development_score`| `Number (Float)`| 是 | `0` 到 `4.0` | Topic Development（话题展开）单项得分 |
| `feedback` | `String` | 否 | | AI 提供的总体反馈和建议 |
| `transcript` | `String` | 否 | | 用户的语音识别文本内容 |

- **Response (201 Created)**:
  成功创建时，若 Header 设置了 `Prefer: return=representation`，服务器将返回写入的数据行：
  ```json
  [
    {
      "id": "abc123xx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
      "user_id": "uuid-of-the-user",
      "date": "2026-03-20T14:30:00+00:00",
      "task_type": "Independent",
      "duration_minutes": 15.5,
      "overall_score": 28,
      "delivery_score": 4.0,
      "language_use_score": 3.5,
      "topic_development_score": 4.0,
      "feedback": "Outstanding performance!...",
      "transcript": "If I had to choose...",
      "created_at": "2026-04-24T08:05:00+00:00"
    }
  ]
  ```

---

### 2.2 获取用户的 TOEFL 练习历史 (Fetch User Sessions)

供 Dashboard 等客户端拉取数据展示。（目前前端已通过 supabase-js 实现，此处为对应的 REST 描述）。

- **URL**: `/toefl_sessions?user_id=eq.<USER_ID>&order=date.asc`
- **Method**: `GET`
- **Headers**:
  ```http
  apikey: <SUPABASE_ANON_KEY>
  Authorization: Bearer <USER_ACCESS_TOKEN>
  ```
- **Response (200 OK)**:
  返回 JSON 数组，包含所有符合条件的记录。

---

## 3. 硬件端对接建议

1. **离线与断网重传**：如果在硬件设备测评结束后无法连接网络，建议在硬件本体保存一个重传队列（队列内容为上述 Body 的 JSON）。等设备连入 WiFi 或者蓝牙配套 App 时进行批量 `POST` 请求同步。
2. **鉴权方案**：如果硬件不直接处理用户登录的 JWT Token，可以依靠手机端配套的 App 获取 `ACCESS_TOKEN`，由手机端负责转发此请求到 Supabase。或在硬件设备绑定时颁发一个长效的 JWT 给设备。
