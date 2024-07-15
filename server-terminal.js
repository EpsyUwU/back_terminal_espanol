const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { Client } = require('ssh2');
const cors = require('cors');

const app = express();

// Configurar CORS
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "http://localhost:5173",
        methods: ["GET", "POST"],
        allowedHeaders: ["Content-Type"],
        credentials: true,
    },
});

// Configurar conexión SSH
const sshConfig = {
    host: '172.26.208.1', // Reemplaza con tu servidor SSH
    port: 22,
    username: 'esteban1', // Reemplaza con tu usuario SSH
    password: 'esteban' // Reemplaza con tu contraseña SSH
};

// Mapeo de comandos en español a comandos en inglés
const comandoTraducido = {
    listar: 'ls',
    crearDirectorio: 'mkdir',
    eliminar: 'rm',
    mover: 'mv',
    copiar: 'cp',
    cambiarDirectorio: 'cd',
    mostrarDirectorioActual: 'pwd',
    verContenidoArchivo: 'cat',
    cambiarPermisos: 'chmod',
    verEspacioDisco: 'df',
    verConsumoRecursos: 'top',
    listarProcesos: 'ps',
    verHistorialComandos: 'history'
};

// Manejar conexión de clientes
io.on('connection', (socket) => {
    console.log('Cliente conectado');

    // Conectar a SSH
    const ssh = new Client();
    ssh.on('ready', () => {
        console.log('Conexión SSH establecida');

        // Manejar comandos del cliente
        socket.on('command', (command) => {
            console.log('Comando recibido:', command);

            // Traducir comando a inglés si está en el mapeo
            if (comandoTraducido.hasOwnProperty(command)) {
                command = comandoTraducido[command];
            }

            ssh.exec(command, (err, stream) => {
                if (err) {
                    socket.emit('output', `Error al ejecutar el comando: ${err.message}`);
                    return;
                }

                let output = ''; // Inicializa una variable para almacenar la salida

                stream.on('data', (data) => {
                    output += data.toString('utf8'); // Concatena la salida
                });

                stream.stderr.on('data', (data) => {
                    output += `Error: ${data.toString('utf8')}`; // Concatena los errores
                });

                stream.on('close', () => {
                    socket.emit('output', output); // Envía la salida completa al cliente
                    console.log(output); // Muestra la salida en el servidor
                });
            });
        });
    });

    ssh.connect(sshConfig);

    // Manejar desconexión del cliente
    socket.on('disconnect', () => {
        console.log('Cliente desconectado');
        ssh.end();
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Servidor escuchando en el puerto ${PORT}`);
});
