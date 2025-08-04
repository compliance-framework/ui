#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}Starting CCF UI deployment to Kubernetes...${NC}"

# Check if minikube is running
if ! minikube status | grep -q "Running"; then
    echo -e "${RED}Minikube is not running. Please start minikube first.${NC}"
    exit 1
fi

# Use minikube's Docker daemon
echo -e "${YELLOW}Configuring Docker to use minikube's daemon...${NC}"
eval $(minikube docker-env)

# Build the frontend image
echo -e "${YELLOW}Building CCF UI Docker image...${NC}"
cd ..
docker build -t ccf-ui:latest .
if [ $? -ne 0 ]; then
    echo -e "${RED}Failed to build Docker image${NC}"
    exit 1
fi

# Apply Kubernetes manifests
echo -e "${YELLOW}Applying Kubernetes manifests...${NC}"
cd k8s
kubectl apply -f configmap.yaml
kubectl apply -f deployment.yaml
kubectl apply -f service.yaml

# Wait for deployment to be ready
echo -e "${YELLOW}Waiting for deployment to be ready...${NC}"
kubectl wait --for=condition=available --timeout=300s deployment/ccf-ui-deployment

# Check deployment status
if [ $? -eq 0 ]; then
    echo -e "${GREEN}CCF UI deployed successfully!${NC}"
    echo ""
    echo -e "${GREEN}To access the frontend:${NC}"
    echo -e "${YELLOW}1. Run: kubectl port-forward service/ccf-ui-service 3000:3000${NC}"
    echo -e "${YELLOW}2. Open: http://localhost:3000${NC}"
    echo ""
    echo -e "${GREEN}The frontend is configured to connect to the backend at: http://ccf-api-service:8080${NC}"
else
    echo -e "${RED}Deployment failed. Check the logs:${NC}"
    echo -e "${YELLOW}kubectl logs -l app=ccf-ui${NC}"
    exit 1
fi