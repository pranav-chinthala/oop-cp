# How to Run the Project

This guide covers running the full project on **macOS**:
- Spring Boot backend (`oop`)
- React frontend (`frontend`)
- LocalStack-based AWS emulator flows
- Optional standalone AWS SDK v2 demo (`java-sdk-v2`)

---

## 1) Prerequisites

Install/verify the following:

- **Java**
  - Backend (`oop`) uses Java toolchain **23** (from `build.gradle`)
  - `java-sdk-v2` uses Java **17**+
- **Node.js** 18+ and npm
- **Docker Desktop** (running)
- **LocalStack CLI**
- **AWS CLI** and `awslocal`
- **MySQL** (running locally)

Quick checks:

```bash
java -version
node -v
npm -v
docker --version
localstack --version
aws --version
awslocal --version
mysql --version
```

---

## 2) Clone/Open and move to root

```bash
cd "/Users/homfolderofpranav/Documents/A Projects/OOP"
```

---

## 3) Start required services

### 3.1 Start MySQL

Ensure MySQL is running on `localhost:3306`.

If using Homebrew service:

```bash
brew services start mysql
```

### 3.2 Start LocalStack

In a separate terminal:

```bash
localstack start
```

Keep this terminal open.

---

## 4) Run backend (Spring Boot)

Open a new terminal:

```bash
cd "/Users/homfolderofpranav/Documents/A Projects/OOP/oop"
chmod +x gradlew
./gradlew bootRun --console=plain
```

Backend runs on:
- `http://localhost:8081`

### Backend configuration notes

Current `application.properties` expects:
- DB URL: `jdbc:mysql://localhost:3306/oop_rmcs?createDatabaseIfNotExist=true&useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=UTC`
- DB user: `root`
- DB password: `lemmeIn8055`

If your local MySQL password differs, update:

```properties
oop/src/main/resources/application.properties
```

---

## 5) Run frontend (React + Vite)

Open another terminal:

```bash
cd "/Users/homfolderofpranav/Documents/A Projects/OOP/frontend"
npm install
npm run dev
```

Frontend runs on:
- `http://localhost:5173`

The backend allows this origin (`app.frontend.url=http://localhost:5173`).

---

## 6) Verify app is up

- Open frontend: `http://localhost:5173`
- Backend health check (basic):

```bash
curl -i http://localhost:8081
```

(If `/` is not mapped in your backend, test one of your API endpoints directly.)

---

## 7) Test AWS emulator endpoint (backend API)

With backend + LocalStack running, run from any terminal:

### 7.1 Check LocalStack status via backend

```bash
curl -X POST http://localhost:8081/api/emulator/aws \
  -H "Content-Type: application/json" \
  -d '{
    "service": "LOCALSTACK",
    "action": "STATUS",
    "parameters": {}
  }'
```

### 7.2 Bootstrap resources (`records` bucket + `person` table)

```bash
curl -X POST http://localhost:8081/api/emulator/aws \
  -H "Content-Type: application/json" \
  -d '{
    "service": "LOCALSTACK",
    "action": "BOOTSTRAP",
    "parameters": {}
  }'
```

### 7.3 Optional S3 put object

```bash
curl -X POST http://localhost:8081/api/emulator/aws \
  -H "Content-Type: application/json" \
  -d '{
    "service": "S3",
    "action": "PUT_OBJECT",
    "resourceName": "records",
    "parameters": {
      "key": "hello-v2.txt",
      "content": "Hello from AWS emulator"
    }
  }'
```

---

## 8) Optional: Run standalone `java-sdk-v2` demo

Use this only if you want to run the independent AWS SDK sample directly.

Open another terminal:

```bash
cd "/Users/homfolderofpranav/Documents/A Projects/OOP/java-sdk-v2"
```

Create LocalStack resources (once):

```bash
chmod +x src/main/resources/create-s3-bucket.sh src/main/resources/create-dynamodb-table.sh
./src/main/resources/create-s3-bucket.sh
./src/main/resources/create-dynamodb-table.sh
```

Run S3 service demo:

```bash
mvn exec:java -Dexec.mainClass="v2.s3.S3Service"
```

Run DynamoDB service demo:

```bash
mvn exec:java -Dexec.mainClass="v2.dynamodb.DynamoDBService"
```

---

## 9) Optional: Use Postman collection

Import:
- `AtlasOps Platform API.postman_collection.json`

Set base URL to:
- `http://localhost:8081`

---

## 10) Stop everything

- Stop frontend/backend with `Ctrl + C` in their terminals
- Stop LocalStack with `Ctrl + C` in LocalStack terminal
- (Optional) stop MySQL service:

```bash
brew services stop mysql
```

---

## Troubleshooting

- **Port 8081 already in use**: change `server.port` in `oop/src/main/resources/application.properties`.
- **Port 5173 already in use**: Vite may pick another port; check terminal output.
- **DB auth failure**: fix `spring.datasource.username/password` in backend config.
- **LocalStack connection errors**: ensure Docker is running and `localstack start` completed successfully.
- **`awslocal` not found**: install it, or use `aws --endpoint-url=http://localhost:4566 ...` equivalent commands.
