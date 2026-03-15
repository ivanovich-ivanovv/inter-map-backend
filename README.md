# Inter Map Backend

Backend Node.js + Express + MongoDB cho bai toan:
- Dang ky / dang nhap nguoi dung
- Cap nhat vi tri va thu thap item theo ban kinh
- Theo doi thiet bi theo thoi gian thuc (Socket.IO)
- Phat voice welcome (TTS) khi thiet bi den gan server

## 1) Cong nghe chinh

- Node.js + Express
- MongoDB + Mongoose
- Socket.IO
- JWT auth
- Rate limiting + Helmet + CORS
- TTS bang Python gTTS (tuy chon)

## 2) Cau truc thu muc

- index.js: Diem vao app, mount routes, khoi tao WebSocket
- db.js: Ket noi MongoDB
- routes/: Dinh nghia API endpoints
- controllers/: Xu ly logic theo route
- services/: Arrival detector, websocket, voice welcome, wifi scanner
- models/: User, Item, Device, EventLog, CollectLog
- config/: limiter, server location
- middleware/: auth, logger, token blacklist
- audio/: Chua file mp3 sinh ra

## 3) Yeu cau moi truong

- Node.js 18+ (khuyen nghi 18/20)
- MongoDB (local hoac cloud)
- Python 3 + pip (neu dung TTS)

## 4) Cai dat va chay

### Buoc 1: Cai package Node.js

npm install

### Buoc 2: Tao file .env

Tao file .env o thu muc goc voi noi dung goi y:

PORT=3000
MONGO_URI=mongodb://127.0.0.1:27017/intermap
JWT_SECRET=change_me_in_production

# Server GPS location (co the bo qua neu dung mac dinh)
SERVER_LAT=10.0130682
SERVER_LNG=105.7308913
SERVER_NAME=Dai hoc FPT phan hieu Can Tho

# API rate limit
API_RATE_LIMIT_WINDOW_MS=60000
API_RATE_LIMIT_MAX=120

### Buoc 3: Chay server

npm start

Server mac dinh chay tai http://localhost:3000

## 5) TTS (Voice Welcome) - tuy chon

Service voice welcome goi Python de tao file mp3 trong thu muc audio.

Cai gTTS:

pip install gTTS

Test nhanh audio:

node test-audio.js

Neu may khong co lenh python, service se thu python3.

## 6) API tong quan

Base URL: http://localhost:3000

Health check:
- GET /healthz

### 6.1 Auth

- POST /auth/register
  - body: { email, password, displayName? }
- POST /auth/login
  - body: { email, password }
- POST /auth/logout
  - header: Authorization: Bearer <token>

### 6.2 User

- GET /user/me
  - can JWT
- PUT /user/me
  - can JWT
  - body co the gom: { displayName, lastLocation }

### 6.3 Item gameplay

- POST /admin/seed
  - seed item mau (dev)
- GET /nearby?lat=<lat>&lng=<lng>&radius=500
  - lay item trong ban kinh (m)
- POST /location
  - can JWT
  - body: { lat, lng }
  - cap nhat vi tri user + tra nearby items
- POST /collect
  - can JWT
  - body: { itemId, lat, lng }
  - co check khoang cach thu item (<= 20m), anti spam, anti speed

### 6.4 Device tracking

- POST /devices/update
  - body: { deviceId, userName, latitude, longitude, rssi?, timestamp? }
  - neu co JWT hop le thi uu tien displayName tu user
- GET /devices
  - lay danh sach device dang track + server location
- DELETE /devices/:deviceId
  - xoa device khoi tracking in-memory
- GET /devices/server-location
  - lay GPS server
- GET /devices/events?limit=100
  - lay event logs gan day
- POST /devices/reset
  - reset toan bo session welcome trong memory

## 7) Socket.IO realtime

- Path: /devices/live
- Client nhan cac su kien:
  - devices:snapshot
  - device:update
  - device:arrived
  - device:welcome
  - device:removed
  - event:log
  - devices:reset
- Client co the gui:
  - device:update
  - devices:reset

## 8) Logic arrival/welcome

- Device duoc danh dau arrived khi GPS distance <= 5m
- Moi device chi welcome 1 lan trong session
- Device stale se bi remove neu khong update > 60s
- Event log duoc luu MongoDB va TTL 24h

## 9) Scripts ho tro

- npm start: chay server voi nodemon
- node simulateDevices.js [backendUrl] [deviceCount]
  - gia lap nhieu thiet bi di chuyen den gan server
- node test-audio.js
  - test tao mp3 welcome

## 10) Bao mat va luu y

- Dang xuat hien tai su dung token blacklist in-memory (mat khi restart)
- Can doi JWT_SECRET manh khi deploy
- CORS dang de origin=true de ho tro tunnel/dev, can khoa lai khi production
- Logger dang in headers/body, can can nhac bot thong tin nhay cam khi production

## 11) Loi thuong gap

1. Loi ket noi MongoDB
- Kiem tra MONGO_URI
- Dam bao MongoDB dang chay

2. Khong tao duoc audio
- Kiem tra Python 3 va pip
- pip install gTTS
- Thu chay node test-audio.js de debug

3. Khong nhan duoc su kien realtime
- Kiem tra client connect dung path /devices/live
- Kiem tra CORS va dia chi backend

## 12) Goi y production

- Dung PM2 hoac Docker thay nodemon
- Dung Redis cho token blacklist
- Tach logger theo level + luu file
- Bo sung validation schema cho request body
- Viet test API tu dong (Postman/Newman hoac Jest + Supertest)
