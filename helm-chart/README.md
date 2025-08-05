# CCF UI Helm Chart

This Helm chart deploys the CCF UI (Compliance Configuration Framework UI) to Kubernetes.

## Prerequisites

- Kubernetes cluster (minikube, Docker Desktop, or cloud provider)
- Helm 3.x installed
- kubectl configured
- Backend API already deployed

## Installation

### Quick Install (Development)

```bash
# From the ui root directory
./helm-deploy.sh
```

### Manual Install

1. Build the Docker image (for local development):
   ```bash
   eval $(minikube docker-env)  # If using minikube
   docker build -t ccf-ui:latest .
   ```

2. Install the Helm chart:
   ```bash
   helm install ccf-ui ./helm-chart/ccf-ui -f ./helm-chart/ccf-ui/values-dev.yaml
   ```

### Install with custom values:
```bash
helm install ccf-ui ./helm-chart/ccf-ui \
  --set config.apiUrl="http://your-backend:8080" \
  --set image.tag="v1.0.0"
```

## Configuration

The following table lists the configurable parameters and their default values.

| Parameter | Description | Default |
|-----------|-------------|---------|
| `replicaCount` | Number of replicas | `1` |
| `image.repository` | Image repository | `ccf-ui` |
| `image.tag` | Image tag | `latest` |
| `image.pullPolicy` | Image pull policy | `Never` |
| `service.type` | Kubernetes service type | `NodePort` |
| `service.port` | Service port | `3000` |
| `service.nodePort` | NodePort (if applicable) | `30300` |
| `ingress.enabled` | Enable ingress | `false` |
| `config.apiUrl` | Backend API URL | `http://localhost:8080` |
| `resources.limits.cpu` | CPU limit | `200m` |
| `resources.limits.memory` | Memory limit | `256Mi` |

## Upgrading

To upgrade an existing release:
```bash
helm upgrade ccf-ui ./helm-chart/ccf-ui -f ./helm-chart/ccf-ui/values-dev.yaml
```

## Uninstalling

To uninstall/delete the deployment:
```bash
helm uninstall ccf-ui
```

## ArgoCD Deployment

To deploy using ArgoCD:

1. Apply the ArgoCD application:
   ```bash
   kubectl apply -f argocd/ccf-ui-application.yaml
   ```

2. Or using ArgoCD CLI:
   ```bash
   argocd app create ccf-ui \
     --repo https://github.com/compliance-framework/ui.git \
     --path helm-chart/ccf-ui \
     --dest-server https://kubernetes.default.svc \
     --dest-namespace default \
     --values values-dev.yaml
   ```

## Environment-Specific Deployments

### Development
```bash
helm install ccf-ui ./helm-chart/ccf-ui -f ./helm-chart/ccf-ui/values-dev.yaml
```

### Production
```bash
helm install ccf-ui ./helm-chart/ccf-ui -f ./helm-chart/ccf-ui/values-prod.yaml
```

## Accessing the Application

After deployment:

1. **NodePort** (default):
   ```bash
   minikube service ccf-ui --url
   # Or get the NodePort:
   kubectl get svc ccf-ui
   ```

2. **Port Forward**:
   ```bash
   kubectl port-forward svc/ccf-ui 3000:3000
   ```

3. **Ingress** (if enabled):
   Access via the configured host (e.g., `http://ui.ccf.local`)

## Backend Integration

The UI connects to the backend API. Configure the connection:

1. **Same namespace**: Use the service name (e.g., `http://ccf-api:8080`)
2. **Different namespace**: Use FQDN (e.g., `http://ccf-api.backend-namespace.svc.cluster.local:8080`)
3. **External**: Use the full URL (e.g., `https://api.example.com`)

## Troubleshooting

### Check deployment status:
```bash
kubectl get deployment ccf-ui
kubectl get pods -l app.kubernetes.io/name=ccf-ui
```

### View logs:
```bash
kubectl logs -l app.kubernetes.io/name=ccf-ui
```

### Check configuration:
```bash
kubectl describe configmap ccf-ui-config
```

### Test backend connectivity:
```bash
kubectl exec deployment/ccf-ui -- wget -qO- http://localhost:8080/health
```

## Development

To modify the chart:

1. Edit templates in `helm-chart/ccf-ui/templates/`
2. Update values in `helm-chart/ccf-ui/values.yaml`
3. Test with `helm template` to preview generated manifests:
   ```bash
   helm template ccf-ui ./helm-chart/ccf-ui -f ./helm-chart/ccf-ui/values-dev.yaml
   ```

## Security Considerations

- Use Kubernetes Secrets for sensitive data
- Enable RBAC and network policies
- Use TLS for ingress
- Set proper security contexts
- Scan images for vulnerabilities