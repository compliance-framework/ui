#!/bin/bash
set -e

echo "🚀 Deploying CCF UI using Helm"

# Check if minikube is running
if ! minikube status | grep -q "Running"; then
    echo "❌ Minikube is not running. Please start it with: minikube start"
    exit 1
fi

echo "📦 Building Docker image inside minikube..."
eval $(minikube docker-env)

# Build the UI image
docker build -t ccf-ui:latest .

echo "🔧 Installing Helm chart..."
helm upgrade --install ccf-ui ./helm-chart/ccf-ui \
  -f ./helm-chart/ccf-ui/values-dev.yaml \
  --create-namespace \
  --namespace default \
  --wait

echo "✅ Helm deployment complete!"
echo ""
echo "📋 Status:"
helm status ccf-ui
echo ""
echo "🌐 To access CCF UI:"
echo "   kubectl port-forward svc/ccf-ui 3000:3000"
echo "   Then open http://localhost:3000"