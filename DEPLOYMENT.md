# EC2 Deployment

This repository can be launched on a fresh EC2 instance with a single command.

## What runs

- Frontend on port `5173`
- Backend on port `8081`
- MySQL inside Docker, with persistent volume storage
- LocalStack inside Docker for S3 and DynamoDB emulation

## One-command startup

From the repository root:

```bash
sudo bash deploy_ec2.sh
```

The script will:

- install Docker if it is missing
- build the backend and frontend images
- start the DB, backend, frontend, and LocalStack containers
- bootstrap the LocalStack bucket and DynamoDB table used by the app

## Access

After startup:

- open `http://<ec2-public-ip>:5173`
- the backend is available on `http://<ec2-public-ip>:8081`
- LocalStack is available on `http://<ec2-public-ip>:4566`

## Notes

- The frontend remains on port `5173` as requested.
- Database configuration is handled entirely by Docker Compose.
- Data is persisted in Docker volumes, so container restarts do not wipe the DB.