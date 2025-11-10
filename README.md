# HealthyCheckApp   
**Ứng dụng theo dõi sức khỏe cá nhân – Ghi nhận chỉ số sức khoẻ và cung cấp thông tin lành mạnh để cải thiện sức khoẻ bản thân**

[![React Native](https://img.shields.io/badge/React%20Native-v0.73-blue)](https://reactnative.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-v18%20LTS-green)](https://nodejs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-brightgreen)](https://www.mongodb.com/atlas)
[![Expo](https://img.shields.io/badge/Expo-Go-orange)](https://expo.dev/)
[![Deploy](https://img.shields.io/badge/Backend-Deployed%20on%20Render-blue)](https://render.com)

---

## Tổng quan dự án

**HealthyCheckApp** giúp người dùng:
- Theo dõi các chỉ số sức khỏe: **Bước chạy, Lượng nước, Dinh dưỡng, Giấc ngủ, BMI, Thời gian tập thể dục**
- Xem/Đọc các bài báo về sức khoẻ
- Xem biểu đồ xu hướng theo ngày/tuần/tháng
- Tính điểm, đánh giá sức khoẻ của từng cá nhân theo tuần

> Dự án được xây dựng trong môn **Lập trình Di động** – Dùng công nghệ hiện đại, dễ mở rộng.

---

## Kiến trúc hệ thống (3 lớp)

| Lớp          | Công nghệ                     | Mục đích |
|--------------|-------------------------------|---------|
| **Frontend** | React Native + Expo           | Giao diện di động mượt mà |
| **Backend**  | Node.js + Express.js          | Xử lý API, xác thực, logic |
| **Database** | MongoDB Atlas (Cloud)         | Lưu trữ dữ liệu linh hoạt |

---

## Yêu cầu cài đặt (Prerequisites)

| Loại                  | Công cụ                                  | Mục đích |
|-----------------------|------------------------------------------|---------|
| **Môi trường chạy**   | **Node.js** (v18 LTS hoặc v20 LTS)       | Chạy backend & Expo CLI |
| **Quản lý CSDL**      | **MongoDB Atlas** (cloud) <br> **MongoDB Compass** (GUI - tùy chọn) | Lưu trữ & quản lý dữ liệu NoSQL |
| **Mobile Development**| **Expo Go** (app trên điện thoại)        | Test nhanh ứng dụng React Native |

> **Backend đã được deploy 24/7 trên Render** →  **không cần chạy local backend** để test app!

---

## 🚀 Hướng dẫn chạy Backend (Server)

> **Backend đã được deploy 24/7 trên Render**  
> **URL API**: `https://nhom16-healthycheck.onrender.com`  
> **Bạn có thể bỏ qua chạy local backend** và sang thẳng bước **Frontend**

---

### Nếu vẫn muốn chạy backend trên local (tùy chọn)

#### 1. Vào thư mục backend
```bash
cd HealthCheck_Backend
```
#### 2. Cài đặt thư viện
```bash
npm install
```
#### 3. Thiết lập biến môi trường (.env)
Tạo file .env trong thư mục HealthCheck_Backend với nội dung:
```bash
MONGO_URI=mongodb+srv://<username>:<password>@cluster0.6so65wb.mongodb.net/healthcheck?retryWrites=true&w=majority
PORT=5000
JWT_SECRET=your_very_secure_jwt_secret_key_2025
```
Thay thế:
<username> và <password> bằng thông tin MongoDB Atlas
JWT_SECRET nên dài ít nhất 32 ký tự
#### 4. Mở quyền truy cập IP trên MongoDB Atlas
o	Đăng nhập MongoDB Atlas.
o	Vào mục "Network Access".
o	Thêm IP của bạn (hoặc chọn "ALLOW ACCESS FROM ANYWHERE" - 0.0.0.0/0) để server Node.js có thể kết nối.
#### 5. Chạy server
```bash
nodemon server.js
```
Server sẽ chạy tại: http://localhost:5000

## 🚀 Hướng dẫn chạy Frontend (App)
#### 1.Vào thư mục frontend
```bash
cd HealthCheck_Frontend
```
#### 2. Cài đặt thư viện
```bash
npm install
```
#### 3. Chạy ứng dụng
Yêu cầu:
Ứng dụng Expo Go đã cài trên điện thoại và có mạng
Nếu cùng mạng wifi:
```bash
npm run start
```
Mở app Expo Go → Quét mã QR
Nếu không cùng mạng wifi:
```bash
npx expo start --tunnel
```
(Ứng dụng sẽ tự động build và cài đặt lên máy ảo/thiết bị của bạn.)



