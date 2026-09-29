<?php
header('Content-Type: application/json');

$host = 'localhost';
$db   = 'evento_db';
$user = 'root';
$pass = '';

try {
    $pdo = new PDO("mysql:host=$host;dbname=$db;charset=utf8", $user, $pass);
} catch (PDOException $e) {
    echo json_encode(['error' => 'Falha na conexão com o banco de dados: ' . $e->getMessage()]);
    exit;
}

// Consultar capacidade total do evento
$stmtEvento = $pdo->query("SELECT capacidade_maxima FROM eventos LIMIT 1");
$evento = $stmtEvento->fetch(PDO::FETCH_ASSOC);
$capacidade_maxima = $evento ? (int)$evento['capacidade_maxima'] : 2;

// Consultar total de entradas e saídas atuais
$stmtEntradas = $pdo->query("SELECT COUNT(*) as total FROM leituras_tag WHERE tipo_movimento = 'entrada'");
$total_entradas = (int)$stmtEntradas->fetch(PDO::FETCH_ASSOC)['total'];

$stmtSaidas = $pdo->query("SELECT COUNT(*) as total FROM leituras_tag WHERE tipo_movimento = 'saida'");
$total_saidas = (int)$stmtSaidas->fetch(PDO::FETCH_ASSOC)['total'];

$publico_atual = max(0, $total_entradas - $total_saidas);

$mensagem_resposta = "";
$sucesso_registro = true;

// Processar leitura de TAG (POST)
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $tag_id = $_POST['tag_id'] ?? '';
    $tipo_manual = $_POST['tipo'] ?? '';

    if ($tag_id !== '') {
        // Determinar se é Entrada ou Saída se não for informado manualmente
        if (empty($tipo_manual)) {
            $stmtLast = $pdo->prepare("SELECT tipo_movimento FROM leituras_tag WHERE tag_id = ? ORDER BY id DESC LIMIT 1");
            $stmtLast->execute([$tag_id]);
            $ultimaLeitura = $stmtLast->fetch(PDO::FETCH_ASSOC);

            if ($ultimaLeitura && $ultimaLeitura['tipo_movimento'] === 'entrada') {
                $tipo = 'saida';
            } else {
                $tipo = 'entrada';
            }
        } else {
            $tipo = $tipo_manual;
        }

        // BLOQUEIO DE SEGURANÇA: Impede novas ENTRADAS se a capacidade foi atingida
        if ($tipo === 'entrada' && $publico_atual >= $capacidade_maxima) {
            $sucesso_registro = false;
            $mensagem_resposta = "ENTRADA RECUSADA: Capacidade máxima atingida!";
        } else {
            // Permite registrar no banco de dados (Saídas ou Entradas dentro do limite)
            $stmt = $pdo->prepare("INSERT INTO leituras_tag (tag_id, tipo_movimento) VALUES (?, ?)");
            $stmt->execute([$tag_id, $tipo]);

            // Atualiza os contadores para retornar o estado mais recente
            if ($tipo === 'entrada') {
                $total_entradas++;
                $publico_atual++;
            } else {
                $total_saidas++;
                $publico_atual = max(0, $publico_atual - 1);
            }

            $mensagem_resposta = "Movimento registrado: " . strtoupper($tipo);
        }
    }
}

$percentual_ocupacao = ($capacidade_maxima > 0) ? ($publico_atual / $capacidade_maxima) * 100 : 0;
$bloquear_catraca = $publico_atual >= $capacidade_maxima; //[cite: 1]
$alerta_preventivo = $percentual_ocupacao >= 85; //[cite: 1]

echo json_encode([
    'capacidade_maxima' => $capacidade_maxima,
    'total_entradas' => $total_entradas,
    'total_saidas' => $total_saidas,
    'publico_atual' => $publico_atual,
    'percentual_ocupacao' => round($percentual_ocupacao, 2),
    'bloquear_catraca' => $bloquear_catraca, //[cite: 1]
    'alerta_preventivo' => $alerta_preventivo, //[cite: 1]
    'sucesso_registro' => $sucesso_registro,
    'mensagem' => $mensagem_resposta
]);
?>