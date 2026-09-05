let ESPLoader;
let transport;
let device;
let isConnected = false;

// Извлекаем ESPLoader из глобального бандера esptool-js
const { ESPLoader: Loader, Transport } = window.esptooljs || {};

const connectBtn = document.getElementById('connectBtn');
const programBtn = document.getElementById('programBtn');
const statusText = document.getElementById('status');
const logArea = document.getElementById('log');
const progressBar = document.getElementById('progressBar');

function log(msg) {
  logArea.value += msg + '\n';
  logArea.scrollTop = logArea.scrollHeight;
}

// 1. Подключение к устройству
connectBtn.addEventListener('click', async () => {
  if (!navigator.serial) {
    alert('Web Serial API не поддерживается вашим браузером (используйте Chrome или Edge).');
    return;
  }

  try {
    const devicePort = await navigator.serial.requestPort();
    transport = new Transport(devicePort);

    const loaderOptions = {
      transport: transport,
      baudrate: 115200,
      terminal: {
        writeLine: (msg) => log(msg),
        write: (msg) => log(msg),
      }
    };

    ESPLoader = new Loader(loaderOptions);
    statusText.innerText = 'Статус: Подключение...';
    
    await ESPLoader.main();
    await ESPLoader.flashId();

    statusText.innerText = 'Статус: Подключено (ESP32)';
    connectBtn.innerText = 'Отключить';
    programBtn.disabled = false;
    isConnected = true;
  } catch (err) {
    log(`[Ошибка]: ${err.message}`);
    statusText.innerText = 'Статус: Ошибка подключения';
  }
});

// 2. Процесс прошивки
programBtn.addEventListener('click', async () => {
  const fileInput = document.getElementById('firmwareFile');
  const offsetInput = document.getElementById('offset').value;

  if (!fileInput.files.length) {
    alert('Выберите .bin файл для прошивки!');
    return;
  }

  const file = fileInput.files[0];
  const reader = new FileReader();

  reader.onload = async (e) => {
    const fileData = e.target.result;
    
    const fileArray = [{
      data: fileData,
      address: parseInt(offsetInput, 16)
    }];

    try {
      programBtn.disabled = true;
      log('Начало стирания и записи...');

      await ESPLoader.writeFlash({
        fileArray: fileArray,
        flashSize: 'keep',
        eraseAll: false,
        compress: true,
        reportProgress: (fileIdx, written, total) => {
          const percent = Math.floor((written / total) * 100);
          progressBar.style.width = `${percent}%`;
          progressBar.innerText = `${percent}%`;
        }
      });

      log('Прошивка успешно завершена!');
      alert('Устройство успешно прошито!');
    } catch (err) {
      log(`[Ошибка записи]: ${err.message}`);
    } finally {
      programBtn.disabled = false;
    }
  };

  reader.readAsBinaryString(file);
});