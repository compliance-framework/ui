# Compliance and Controls Framework (CCF) - Kubernetes Deployment Guide

This guide covers the complete Kubernetes deployment of the CCF system including both backend and frontend components.

## System Overview

The CCF system consists of:
- **Frontend**: Vue.js application served by Nginx (port 3000)
- **Backend**: Go API service (port 8080)  
- **Database**: PostgreSQL 17.5 (port 5432)

## Prerequisites

- Minikube installed and running
- kubectl CLI tool
- Docker
- At least 4GB RAM allocated to minikube

## Quick Start

### 1. Start Minikube
```bash
minikube start --memory=4096 --cpus=2
```

### 2. Deploy Backend
```bash
cd ../../../configuration-service/k8s/
./deploy.sh
```

### 3. Deploy Frontend
```bash
cd ../../../ui/k8s/
./deploy.sh
```

### 4. Set up Port Forwarding
```bash
# Terminal 1 - Backend
kubectl port-forward service/ccf-api-service 8080:8080

# Terminal 2 - Frontend
kubectl port-forward service/ccf-ui-service 3000:3000
```

### 5. Access the Application
- Frontend: http://localhost:3000
- Backend API: http://localhost:8080
- Health Check: http://localhost:8080/health

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Kubernetes Cluster                       │
│                                                                  │
│  ┌─────────────────┐     ┌─────────────────┐                   │
│  │   ccf-ui        │     │    ccf-api      │                   │
│  │  Deployment     │────▶│   Deployment    │                   │
│  │  (Nginx:80)     │     │   (Go:8080)     │                   │
│  └────────┬────────┘     └────────┬────────┘                   │
│           │                       │                              │
│           ▼                       ▼                              │
│  ┌─────────────────┐     ┌─────────────────┐                   │
│  │ ccf-ui-service  │     │ccf-api-service  │                   │
│  │  (Port: 3000)   │     │  (Port: 8080)   │                   │
│  └─────────────────┘     └─────────────────┘                   │
│                                   │                              │
│                                   ▼                              │
│                          ┌─────────────────┐                    │
│                          │   PostgreSQL    │                    │
│                          │   Deployment    │                    │
│                          │  (Port: 5432)   │                    │
│                          └─────────────────┘                    │
└─────────────────────────────────────────────────────────────────┘
                                   │
                          Port Forwarding
                                   │
                                   ▼
                          ┌─────────────────┐
                          │   Local Host    │
                          │ localhost:3000  │ ← Browser Access
                          │ localhost:8080  │ ← API Access
                          └─────────────────┘
```

## Frontend Files Overview

- `configmap.yaml` - Frontend configuration (API URL)
- `deployment.yaml` - Frontend deployment specification
- `service.yaml` - Kubernetes service to expose the frontend
- `deploy.sh` - Automated deployment script

## Frontend Deployment

### Quick Deploy
```bash
./deploy.sh
```

### Manual Deploy

1. Configure Docker to use minikube's daemon:
   ```bash
   eval $(minikube docker-env)
   ```

2. Build the frontend Docker image:
   ```bash
   cd ..
   docker build -t ccf-ui:latest .
   ```

3. Apply Kubernetes manifests:
   ```bash
   cd k8s/
   kubectl apply -f configmap.yaml
   kubectl apply -f deployment.yaml
   kubectl apply -f service.yaml
   ```

## Component Details

### Backend (../../../configuration-service/k8s/)
- **Image**: Built from local Dockerfile
- **Port**: 8080
- **Database**: PostgreSQL with persistent volume
- **Environment**: Configured via ConfigMap
- **CORS**: Allows http://localhost:3000

### Frontend (Current Directory)
- **Image**: Multi-stage build (Node + Nginx)
- **Port**: 3000 (proxied from 80)
- **Config**: Runtime configuration via ConfigMap
- **API URL**: http://localhost:8080

## Configuration

The frontend is configured via ConfigMap to connect to the backend at `http://localhost:8080`. This assumes you're using port-forwarding for local development.

### Updating Frontend Configuration

To change the API URL:

1. Edit `configmap.yaml`
2. Apply changes:
   ```bash
   kubectl apply -f configmap.yaml
   kubectl rollout restart deployment ccf-ui-deployment
   ```

## Monitoring and Troubleshooting

### Check Status
```bash
# All resources
kubectl get all

# Specific components
kubectl get deployments
kubectl get pods
kubectl get services
kubectl get configmaps
```

### View Logs
```bash
# Frontend logs
kubectl logs -l app=ccf-ui -f

# Backend logs
kubectl logs -l app=ccf-api -f

# Database logs
kubectl logs -l app=postgres -f
```

### Debug Issues
```bash
# Describe pods for detailed info
kubectl describe pod -l app=ccf-ui
kubectl describe pod -l app=ccf-api
kubectl describe pod -l app=postgres

# Check events
kubectl get events --sort-by=.metadata.creationTimestamp
```

### Common Issues and Solutions

1. **Frontend can't reach backend (ERR_NAME_NOT_RESOLVED)**
   - Ensure both port-forwards are running
   - Check ConfigMap has `http://localhost:8080` not internal service name
   - Verify CORS settings in backend allow http://localhost:3000

2. **Authentication issues**
   - The frontend expects authentication endpoints at `/api/auth/*`
   - Ensure backend is running and accessible
   - Check browser console for specific errors

3. **Database connection issues**
   - Check PostgreSQL pod is running
   - Verify connection string in backend ConfigMap
   - Check persistent volume is mounted

4. **Build failures**
   - Ensure using minikube's Docker daemon: `eval $(minikube docker-env)`
   - Check Docker images: `docker images`
   - Rebuild if needed: `docker build -t ccf-ui:latest .`

## Database Management

### Access PostgreSQL
```bash
# Get pod name
POD=$(kubectl get pod -l app=postgres -o jsonpath="{.items[0].metadata.name}")

# Connect to database
kubectl exec -it $POD -- psql -U ccfuser -d ccfdb
```

### Backup Database
```bash
POD=$(kubectl get pod -l app=postgres -o jsonpath="{.items[0].metadata.name}")
kubectl exec $POD -- pg_dump -U ccfuser ccfdb > backup.sql
```

## Scaling

### Scale Frontend
```bash
kubectl scale deployment ccf-ui-deployment --replicas=3
```

### Scale Backend
```bash
kubectl scale deployment ccf-api --replicas=3
```

## Security Considerations

1. **Secrets**: Database passwords should be moved to Kubernetes Secrets
2. **Network Policies**: Consider implementing network policies
3. **RBAC**: Set up proper role-based access control
4. **TLS**: Add TLS termination for production use

## Clean Up

### Remove Frontend Only
```bash
kubectl delete -f service.yaml
kubectl delete -f deployment.yaml
kubectl delete -f configmap.yaml
```

### Remove Backend
```bash
kubectl delete -f ../../../configuration-service/k8s/
```

### Complete System Cleanup
```bash
# Delete all CCF resources
kubectl delete all -l app=ccf-ui
kubectl delete all -l app=ccf-api
kubectl delete all -l app=postgres
kubectl delete configmap ccf-ui-config ccf-api-config
kubectl delete pvc postgres-pvc
```

## Development Notes

- The frontend uses Vue.js with Vite
- Static files are served by Nginx
- Configuration is injected at runtime via ConfigMap
- The Dockerfile uses multi-stage build for optimization
- API calls are made to `http://localhost:8080/api/*`

## Integration with Backend

The frontend communicates with the backend through:
- API endpoint: `http://localhost:8080/api/*`
- Authentication: `/api/auth/login`
- CORS must be configured on backend to allow `http://localhost:3000`

## Next Steps for Production

1. Use Kubernetes Secrets for sensitive data
2. Implement proper ingress controllers
3. Set up monitoring (Prometheus/Grafana)
4. Configure auto-scaling
5. Implement proper backup strategies
6. Use external database service
7. Set up CI/CD pipelines
8. Configure proper domain names instead of localhost

## Related Repositories

- Backend: `../../../configuration-service`
- Frontend: `../../../ui` (current)
- OSCAL models: `../../../go-oscal`