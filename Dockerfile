# Gunakan Node.js versi ringan
FROM node:18-alpine

# Set folder kerja
WORKDIR /app

# Copy file package.json
COPY package*.json ./

# Install semua dependencies (termasuk devDependencies untuk build)
RUN npm install

# Copy semua source code
COPY . .

# Build aplikasi
RUN npm run build

# Expose port 8080 (Sesuai settingan Container Port tadi)
EXPOSE 8080

# Jalankan aplikasi menggunakan vite preview di port 8080
CMD ["npx", "vite", "preview", "--host", "0.0.0.0", "--port", "8080"]
