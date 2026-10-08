// ======================================
// CONFIGURACIÓN
// ======================================
const API_KEY = 'ff94116ed1491cae62c3bb5e0457225f';
const API_URL = 'https://api.openweathermap.org/data/2.5/weather';
const FORECAST_URL = 'https://api.openweathermap.org/data/2.5/forecast';

// ======================================
// REFERENCIAS AL DOM
// ======================================
const formulario = document.getElementById('formulario');
const inputCiudad = document.getElementById('inputCiudad');
const resultado = document.getElementById('resultado');
const estado = document.getElementById('estado');
const estadoInicial = document.getElementById('estado-inicial');
const historialDiv = document.getElementById('historial');
const pronosticoDiv = document.getElementById('pronostico');
const btnUbicacion = document.getElementById('btnUbicacion');

// ======================================
// CONSULTAR CLIMA
// ======================================
async function consultarClima(ciudad) {
    estadoInicial.style.display = 'none';
    estado.textContent = '⏳ Consultando el clima...';
    resultado.classList.remove('visible');
    pronosticoDiv.innerHTML = '';

    try {
        const ciudadCodificada = encodeURIComponent(ciudad);
        const url = `${API_URL}?q=${ciudadCodificada}&appid=${API_KEY}&units=metric&lang=es`;
        const respuesta = await fetch(url);

        if (!respuesta.ok) {
            if (respuesta.status === 404) throw new Error('Ciudad no encontrada');
            else if (respuesta.status === 401) throw new Error('API Key inválida — espera unos minutos');
            else throw new Error('Error: ' + respuesta.status);
        }

        const datos = await respuesta.json();
        mostrarClima(datos);
        guardarEnHistorial(datos.name);
        await consultarPronostico(ciudadCodificada);
        estado.textContent = '✅ Datos cargados correctamente.';

    } catch (error) {
        estado.textContent = `❌ ${error.message}`;
    }
}

// ======================================
// MOSTRAR CLIMA
// ======================================
function mostrarClima(datos) {
    const ciudad = datos.name;
    const pais = datos.sys.country;
    const temperatura = Math.round(datos.main.temp);
    const sensacion = Math.round(datos.main.feels_like);
    const humedad = datos.main.humidity;
    const presion = datos.main.pressure;
    const viento = datos.wind.speed;
    const descripcion = datos.weather[0].description;
    const icono = datos.weather[0].icon;
    const iconoUrl = `https://openweathermap.org/img/wn/${icono}@2x.png`;

    resultado.innerHTML = `
        <div class="ciudad">${ciudad}</div>
        <div class="pais">${pais}</div>
        <img src="${iconoUrl}" alt="${descripcion}" class="icono-clima">
        <div class="temperatura">${temperatura}°C</div>
        <div class="descripcion">${descripcion}</div>
        <div class="detalles">
            <div class="detalle">
                <div class="etiqueta">Sensación</div>
                <div class="valor">${sensacion}°C</div>
            </div>
            <div class="detalle">
                <div class="etiqueta">Humedad</div>
                <div class="valor">${humedad}%</div>
            </div>
            <div class="detalle">
                <div class="etiqueta">Presión</div>
                <div class="valor">${presion} hPa</div>
            </div>
            <div class="detalle">
                <div class="etiqueta">Viento</div>
                <div class="valor">${viento} m/s</div>
            </div>
        </div>
        <button id="btnCompartir" class="btn-compartir">📱 Compartir en WhatsApp</button>
    `;

    resultado.classList.add('visible');
    cambiarFondoSegunClima(datos.weather[0].main);

    document.getElementById('btnCompartir').addEventListener('click', () => {
        const texto = encodeURIComponent(`🌤️ El clima en ${ciudad} es de ${temperatura}°C — ${descripcion}`);
        window.open(`https://wa.me/?text=${texto}`, '_blank');
    });
}

// ======================================
// CAMBIAR FONDO SEGÚN CLIMA
// ======================================
function cambiarFondoSegunClima(clima) {
    document.body.classList.remove('clima-soleado', 'clima-nublado', 'clima-lluvioso', 'clima-nieve');
    const c = clima.toLowerCase();
    if (c.includes('clear')) document.body.classList.add('clima-soleado');
    else if (c.includes('clouds')) document.body.classList.add('clima-nublado');
    else if (c.includes('rain') || c.includes('drizzle') || c.includes('thunderstorm')) document.body.classList.add('clima-lluvioso');
    else if (c.includes('snow')) document.body.classList.add('clima-nieve');
}

// ======================================
// RETO 1: GEOLocalización
// ======================================
btnUbicacion.addEventListener('click', () => {
    estadoInicial.style.display = 'none';
    estado.textContent = '📍 Obteniendo tu ubicación...';
    
    if (!navigator.geolocation) {
        estado.textContent = '❌ Tu navegador no soporta geolocalización.';
        return;
    }

    navigator.geolocation.getCurrentPosition(
        async (pos) => {
            const lat = pos.coords.latitude;
            const lon = pos.coords.longitude;
            const url = `${API_URL}?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric&lang=es`;
            
            try {
                const res = await fetch(url);
                const datos = await res.json();
                mostrarClima(datos);
                guardarEnHistorial(datos.name);
                await consultarPronostico('', lat, lon);
                estado.textContent = '✅ Ubicación cargada correctamente.';
            } catch {
                estado.textContent = '❌ No se pudo obtener el clima de tu ubicación.';
            }
        },
        () => estado.textContent = '❌ No se pudo acceder a tu ubicación.'
    );
});

// ======================================
// RETO 2: PRONÓSTICO 5 DÍAS
// ======================================
async function consultarPronostico(ciudad, lat, lon) {
    let url;
    if (ciudad) {
        url = `${FORECAST_URL}?q=${ciudad}&appid=${API_KEY}&units=metric&lang=es`;
    } else {
        url = `${FORECAST_URL}?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric&lang=es`;
    }

    try {
        const res = await fetch(url);
        const datos = await res.json();
        mostrarPronostico(datos);
    } catch {
        pronosticoDiv.innerHTML = '';
    }
}

function mostrarPronostico(datos) {
    const pronosticos = [];
    const fechasVistas = new Set();

    for (const item of datos.list) {
        const fecha = item.dt_txt.split(' ')[0];
        if (!fechasVistas.has(fecha) && pronosticos.length < 5) {
            fechasVistas.add(fecha);
            pronosticos.push({
                fecha: new Date(fecha).toLocaleDateString('es', { weekday: 'short', day: 'numeric' }),
                temp: Math.round(item.main.temp),
                icono: item.weather[0].icon
            });
        }
    }

    pronosticoDiv.innerHTML = `
        <h3>📅 Pronóstico de 5 días</h3>
        <div class="contenedor-pronostico">
            ${pronosticos.map(dia => `
                <div class="dia">
                    <div>${dia.fecha}</div>
                    <img src="https://openweathermap.org/img/wn/${dia.icono}.png" alt="">
                    <div class="temp-dia">${dia.temp}°C</div>
                </div>
            `).join('')}
        </div>
    `;
}

// ======================================
// RETO 3: HISTORIAL
// ======================================
function guardarEnHistorial(ciudad) {
    let historial = JSON.parse(localStorage.getItem('historial')) || [];
    historial = historial.filter(c => c.toLowerCase() !== ciudad.toLowerCase());
    historial.unshift(ciudad);
    historial = historial.slice(0, 5);
    localStorage.setItem('historial', JSON.stringify(historial));
    mostrarHistorial();
}

function mostrarHistorial() {
    const historial = JSON.parse(localStorage.getItem('historial')) || [];
    historialDiv.innerHTML = historial.length > 0
        ? `<h4>🕐 Búsquedas recientes:</h4>` +
          historial.map(c => `<button class="btn-historial" data-ciudad="${c}">${c}</button>`).join('')
        : '';

    document.querySelectorAll('.btn-historial').forEach(btn => {
        btn.addEventListener('click', () => consultarClima(btn.dataset.ciudad));
    });
}

// ======================================
// RETO 4: MODO CLARO / OSCURO
// ======================================
const btnModo = document.createElement('button');
btnModo.textContent = '☀️ / 🌙';
btnModo.style.position = 'fixed';
btnModo.style.top = '15px';
btnModo.style.right = '15px';
btnModo.style.padding = '8px 12px';
btnModo.style.borderRadius = '50%';
btnModo.style.background = 'rgba(255,255,255,0.2)';
btnModo.style.color = '#fff';
btnModo.style.border = 'none';
document.body.appendChild(btnModo);

btnModo.addEventListener('click', () => {
    document.body.classList.toggle('modo-claro');
});

// ======================================
// ENVIAR FORMULARIO
// ======================================
formulario.addEventListener('submit', (e) => {
    e.preventDefault();
    const ciudad = inputCiudad.value.trim();
    if (!ciudad) {
        estado.textContent = '⚠️ Escribe el nombre de una ciudad.';
        return;
    }
    consultarClima(ciudad);
    inputCiudad.value = '';
});

// ======================================
// INICIO
// ======================================
mostrarHistorial();