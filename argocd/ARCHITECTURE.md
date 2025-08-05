# CCF UI ArgoCD Architecture

## Overview

This document describes how CCF UI integrates with ArgoCD for GitOps-based deployments.

## Architecture Flow

```
┌─────────────────┐         ┌─────────────────┐         ┌─────────────────┐
│   GitHub Repo   │ ──────▶ │     ArgoCD      │ ──────▶ │   Kubernetes    │
│  (ui)           │  Poll   │                 │  Deploy │   Cluster       │
│                 │         │                 │         │                 │
│ helm-chart/     │         │ - Monitors Git  │         │ ┌─────────────┐ │
│ └── ccf-ui/     │         │ - Syncs changes │         │ │   ccf-ui    │ │
│     ├── values  │         │ - Manages state │         │ │ Deployment  │ │
│     └── templates│         │                 │         │ └─────────────┘ │
└─────────────────┘         └─────────────────┘         └─────────────────┘
```

## Components

### 1. Git Repository
- **Location**: `helm-chart/ccf-ui/`
- **Contents**: Helm chart for UI deployment
- **Values Files**: 
  - `values.yaml` (defaults)
  - `values-dev.yaml` (development)
  - `values-prod.yaml` (production)

### 2. ArgoCD Application
- **Name**: `ccf-ui`
- **Namespace**: `argocd`
- **Target Namespace**: `default` (same as backend)
- **Sync Policy**: Automated with prune and self-heal

### 3. Kubernetes Resources
Generated from Helm templates:
- **Deployment**: UI container (Nginx + Vue.js app)
- **Service**: NodePort/ClusterIP for UI access
- **ConfigMap**: Runtime configuration (API URL)
- **Ingress**: Optional for external access

## Integration with Backend

```
┌─────────────────────────────────────────────┐
│              Kubernetes Namespace            │
│                                              │
│  ┌──────────────┐         ┌──────────────┐  │
│  │   ccf-ui     │ ──────▶ │   ccf-api    │  │
│  │  Service     │  HTTP   │  Service     │  │
│  │ (Port 3000)  │         │ (Port 8080)  │  │
│  └──────────────┘         └──────────────┘  │
│         ▲                         ▲          │
│         │                         │          │
│  ┌──────────────┐         ┌──────────────┐  │
│  │   ccf-ui     │         │   ccf-api    │  │
│  │  Deployment  │         │  Deployment  │  │
│  └──────────────┘         └──────────────┘  │
└─────────────────────────────────────────────┘
```

## Configuration Management

### API URL Configuration
- **Development**: `http://localhost:8080` (port-forward)
- **Production**: `https://api.ccf.yourdomain.com`
- **In-cluster**: `http://ccf-api:8080`

### Environment Variables
Managed through Helm values:
```yaml
ui:
  config:
    apiUrl: "http://localhost:8080"
  env:
    NODE_ENV: "development"
```

## Deployment Strategies

### 1. Unified Namespace
Both UI and API in same namespace:
- Pros: Simple service discovery
- Cons: Less isolation
- Service URL: `http://ccf-api:8080`

### 2. Separate Namespaces
UI and API in different namespaces:
- Pros: Better isolation
- Cons: Requires FQDN
- Service URL: `http://ccf-api.backend-ns.svc.cluster.local:8080`

### 3. External API
UI connects to external API:
- Pros: Decoupled deployment
- Cons: Requires ingress/LoadBalancer
- Service URL: `https://api.example.com`

## Security Considerations

1. **ConfigMap vs Secrets**: API URLs are not sensitive, stored in ConfigMap
2. **Network Policies**: Can restrict UI to only access API service
3. **Ingress TLS**: Use cert-manager for automatic TLS certificates
4. **Security Context**: Runs as non-root user (nginx)

## Monitoring and Observability

### Health Checks
- **Liveness Probe**: `GET /` on port 80
- **Readiness Probe**: `GET /` on port 80

### Metrics
- ArgoCD application metrics
- Kubernetes deployment metrics
- Nginx access logs

## Rollback Strategy

1. **Via ArgoCD UI**: Select previous revision
2. **Via CLI**: `argocd app rollback ccf-ui`
3. **Via Git**: Revert commit and push

## Multi-Environment Setup

```
├── argocd/
│   ├── ccf-ui-application.yaml      # Dev
│   ├── ccf-ui-application-staging.yaml  # Staging
│   └── ccf-ui-application-prod.yaml     # Production
```

Each environment:
- Different values file
- Different namespace
- Different API endpoint
- Different resource limits

## Disaster Recovery

1. **Backup**: Git repository is the source of truth
2. **Restore**: Apply ArgoCD application manifest
3. **Data**: UI is stateless, no data to backup

## Future Enhancements

1. **Blue-Green Deployments**: Using ArgoCD rollouts
2. **Canary Releases**: Progressive delivery
3. **Feature Flags**: Runtime configuration
4. **Multi-Region**: Deploy to multiple clusters
5. **Service Mesh**: Istio/Linkerd integration