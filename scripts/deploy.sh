#!/bin/bash
# Script de deploy para rodar Docker Compose
set -e

# Caminho do projeto (ajuste se necessário)
PROJECT_DIR="$(dirname $(dirname $(realpath $0)))"
cd "$PROJECT_DIR"

echo "Fazendo build e subindo containers..."
docker-compose pull
docker-compose up -d --build

echo "Containers em execução:"
docker-compose ps
