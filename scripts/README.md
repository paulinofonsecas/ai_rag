# Scripts de Deploy AWS EC2

## 1. setup-ec2.sh
Instala Docker, Docker Compose, git e dependências na EC2 Ubuntu.

Uso:
```sh
chmod +x scripts/setup-ec2.sh
./scripts/setup-ec2.sh
# Faça logout/login após rodar para ativar grupo docker
```

## 2. deploy.sh
Faz build e sobe os containers com Docker Compose.

Uso:
```sh
chmod +x scripts/deploy.sh
./scripts/deploy.sh
```

## 3. nginx.conf (opcional)
Exemplo de configuração para servir frontend na porta 80 e fazer proxy para backend.

Copie para `/etc/nginx/sites-available/default` e reinicie o nginx:
```sh
sudo cp scripts/nginx.conf /etc/nginx/sites-available/default
sudo systemctl restart nginx
```

## 4. Deploy de Produção
Para rodar em produção, use o arquivo docker-compose.production.yml:

```sh
docker-compose -f docker-compose.production.yml up -d --build
```

Isso irá expor o frontend na porta 80 e backend apenas internamente.

---

**Ajuste a URL do git clone no setup-ec2.sh antes de rodar!**
