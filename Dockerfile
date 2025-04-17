# 使用官方 PHP 8.2 搭配 Apache 伺服器的映像檔
FROM php:8.2-apache

# Apache 的文件根目錄是 /var/www/html

# 啟用 Apache 的 rewrite 模組 (可選)
RUN a2enmod rewrite

# PHP 的 curl 擴充通常已內建，若有問題可取消註解以下指令
# RUN apt-get update && apt-get install -y libcurl4-openssl-dev && rm -rf /var/lib/apt/lists/*
# RUN docker-php-ext-install curl

# 開放容器的 80 port
EXPOSE 80
