#!/bin/bash
# Script de setup inicial para EC2 Ubuntu
set -e

# Atualiza pacotes e instala dependências
sudo apt-get update && sudo apt-get upgrade -y
sudo apt-get install -y git curl

# Instala Docker
if ! command -v docker &> /dev/null; then
  curl -fsSL https://get.docker.com -o get-docker.sh
  sh get-docker.sh
  sudo usermod -aG docker $USER
  rm get-docker.sh
fi

# Instala Docker Compose
if ! command -v docker-compose &> /dev/null; then
  sudo apt-get install -y docker-compose
fi

# Reinicia Docker e aplica grupo
sudo systemctl restart docker

# Clona o repositório (ajuste a URL abaixo)
git clone https://github.com/paulinofonsecas/ai_rag
cd ai_rag

echo "Setup concluído. Faça logout/login para ativar o grupo docker."
