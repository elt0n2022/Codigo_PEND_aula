CREATE DATABASE IF NOT EXISTS evento_db;
USE evento_db;

CREATE TABLE IF NOT EXISTS eventos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    capacidade_maxima INT NOT NULL
);

CREATE TABLE IF NOT EXISTS leituras_tag (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tag_id VARCHAR(50) NOT NULL,
    tipo_movimento ENUM('entrada', 'saida') NOT NULL,
    data_hora DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Inserir evento de teste com capacidade para 2 pessoas
INSERT INTO eventos (nome, capacidade_maxima) VALUES ('Evento Teste', 2);