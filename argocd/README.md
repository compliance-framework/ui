# ArgoCD Setup for CCF UI

This directory contains ArgoCD Application manifests for deploying CCF UI using GitOps.

## Prerequisites

- ArgoCD installed and running
- Backend (CCF API) already deployed
- Access to ArgoCD UI (port 8090)

## Deploy CCF UI with ArgoCD

### Option 1: Using ArgoCD CLI

```bash
# Login to ArgoCD
argocd login localhost:8090 --insecure

# Create the application
argocd app create ccf-ui \
  --repo https://github.com/compliance-framework/ui \
  --path helm-chart/ccf-ui \
  --dest-server https://kubernetes.default.svc \
  --dest-namespace default \
  --helm-value-files values-dev.yaml

# Sync the application
argocd app sync ccf-ui
```

### Option 2: Using kubectl

```bash
# Apply the application manifest
kubectl apply -f ccf-ui-application.yaml

# Check application status
kubectl get applications -n argocd
```

### Option 3: Using the UI

1. Go to https://localhost:8090
2. Click "New App"
3. Fill in:
   - App Name: `ccf-ui`
   - Project: `default`
   - Sync Policy: `Automatic`
   - Repository: `https://github.com/compliance-framework/ui`
   - Path: `helm-chart/ccf-ui`
   - Cluster: `in-cluster`
   - Namespace: `default`
   - Values Files: `values-dev.yaml`

## GitOps Workflow

1. **Make changes** to Helm chart or values
2. **Commit and push** to Git
3. **ArgoCD detects** changes automatically
4. **Syncs** the cluster to match Git
5. **Verify** in ArgoCD UI

## Connecting to Backend

The UI needs to connect to the backend API. In the same namespace deployment:
- Service name: `ccf-api` or release-specific name
- Port: `8080`
- Full URL: `http://ccf-api:8080` or `http://localhost:8080` with port-forward

## Environment-Specific Deployments

### Development
```bash
# Uses values-dev.yaml by default
kubectl apply -f ccf-ui-application.yaml
```

### Production
Create a separate application manifest:
```yaml
# ccf-ui-application-prod.yaml
# ... same structure but with:
helm:
  valueFiles:
    - values-prod.yaml
```

## Monitoring

Check application status:
```bash
argocd app get ccf-ui
argocd app history ccf-ui
```

## Rollback

```bash
# List revisions
argocd app history ccf-ui

# Rollback to previous
argocd app rollback ccf-ui
```

## Troubleshooting

1. **Check app status**:
   ```bash
   kubectl get applications -n argocd
   argocd app get ccf-ui
   ```

2. **View sync details**:
   ```bash
   argocd app get ccf-ui --refresh
   ```

3. **Force sync**:
   ```bash
   argocd app sync ccf-ui --force
   ```

4. **Check UI logs**:
   ```bash
   kubectl logs -l app.kubernetes.io/instance=ccf-ui
   ```

## Integration with Backend

The UI and API should be in the same namespace for easy communication:
- Backend service: `ccf-api` (or your release name)
- UI service: `ccf-ui`
- Communication: Direct service-to-service

## Best Practices

1. **Use separate applications** for UI and API
2. **Keep values files** in Git for each environment
3. **Use image tags** instead of `latest` in production
4. **Monitor both** UI and API applications together
5. **Test locally** with Helm before pushing to Git