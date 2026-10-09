# Build do frontend em Node, depois junta com Python no container final.
# Hugging Face Spaces (tipo Docker) exige CMD escutando na porta 7860.

FROM node:20-alpine AS front
WORKDIR /app
# Copia só o que o frontend precisa (vendor com .tgz vai junto).
COPY frontend/package.json frontend/package-lock.json* ./
COPY frontend/vendor ./vendor
RUN npm install --no-audit --no-fund
COPY frontend/ ./
RUN npm run build

FROM python:3.12-slim
WORKDIR /app
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 PORT=7860

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Código Python
COPY api.py buscar_gsc.py filtrar.py env.py ./

# Frontend estático gerado no stage anterior
COPY --from=front /app/out ./frontend/out

EXPOSE 7860
CMD ["uvicorn", "api:app", "--host", "0.0.0.0", "--port", "7860"]
