.PHONY: help start stop restart logs status test dev simulate clean

help:
	@echo "🛡️ SENTINELA FRIGATE PRO — COMANDOS DISPONÍVEIS:"
	@echo "  make start      - Inicia todos os serviços em segundo plano (Produção)"
	@echo "  make stop       - Para todos os serviços"
	@echo "  make restart    - Reinicia a stack"
	@echo "  make logs       - Visualiza os logs unificados"
	@echo "  make test       - Executa os testes unitários do backend"
	@echo "  make dev        - Sobe a stack de desenvolvimento local"
	@echo "  make simulate   - Dispara um evento simulado de intrusão para testes"
	@echo "  make status     - Consulta a telemetria do sistema via terminal"

start:
	docker compose up -d

stop:
	docker compose down

restart:
	docker compose restart

logs:
	docker compose logs -f

test:
	PYTHONPATH=backend python3 -m pytest backend/tests -v

dev:
	docker compose -f docker-compose.dev.yml up -d

simulate:
	./scripts/simulate_event.sh

status:
	@curl -s http://localhost:8080/api/telemetry/ | python3 -m json.tool

clean:
	docker compose down -v
