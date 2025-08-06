import React, { useEffect, useState } from 'react';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend
} from 'chart.js';

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend);

const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

type Usuario = {
  email: string;
  name: string;
  created_at: string;
  recordatorio: number;
  sede: string;
};

type Pagos = Record<string, string[]>;
type Bajas = Record<string, string[]>;

export default function Estadisticas() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [pagos, setPagos] = useState<Pagos>({});
  const [bajas, setBajas] = useState<Bajas>({});
  const [tipoGrafico, setTipoGrafico] = useState<'altas' | 'bajas' | 'pagos'>('altas');
  const [conteoMensual, setConteoMensual] = useState<number[]>([]);
  const [sedeSeleccionada, setSedeSeleccionada] = useState<'todas' | 'Temperley' | 'Calzada'>('todas');

  const mesActual = new Date().toISOString().slice(0, 7); // yyyy-mm

  useEffect(() => {
    async function cargarDatos() {
      const [uRes, pRes, bRes] = await Promise.all([
        fetch('/api/users'),
        fetch('/api/pagos'),
        fetch('/api/bajas')
      ]);

      setUsuarios(await uRes.json());
      setPagos(await pRes.json());
      setBajas(await bRes.json());
    }

    cargarDatos();
  }, []);

  useEffect(() => {
    const añoActual = new Date().getFullYear().toString();
    const conteo = new Array(12).fill(0);

    const usuariosFiltrados = sedeSeleccionada === 'todas'
      ? usuarios
      : usuarios.filter(u => u.sede === sedeSeleccionada);

    if (tipoGrafico === 'altas') {
      usuariosFiltrados.forEach((u) => {
        const [año, mes] = u.created_at.split('-');
        if (año === añoActual) conteo[parseInt(mes, 10) - 1]++;
      });
    }

    if (tipoGrafico === 'bajas') {
      Object.entries(bajas).forEach(([email, fechas]) => {
        const usuario = usuarios.find(u => u.email === email);
        if (!usuario) return;
        if (sedeSeleccionada !== 'todas' && usuario.sede !== sedeSeleccionada) return;

        fechas.forEach(fecha => {
          const [año, mes] = fecha.split('-');
          if (año === añoActual) conteo[parseInt(mes, 10) - 1]++;
        });
      });
    }

    if (tipoGrafico === 'pagos') {
      Object.entries(pagos).forEach(([email, fechas]) => {
        const usuario = usuarios.find(u => u.email === email);
        if (!usuario) return;
        if (sedeSeleccionada !== 'todas' && usuario.sede !== sedeSeleccionada) return;

        fechas.forEach(fecha => {
          const [año, mes] = fecha.split('-');
          if (año === añoActual) conteo[parseInt(mes, 10) - 1]++;
        });
      });
    }

    setConteoMensual(conteo);
  }, [tipoGrafico, usuarios, pagos, bajas, sedeSeleccionada]);

  const usuariosDeSede = sedeSeleccionada === 'todas'
    ? usuarios
    : usuarios.filter(u => u.sede === sedeSeleccionada);

  const cantidadTotal = usuariosDeSede.length;
  const cantidadPagosEsteMes = usuariosDeSede.filter(u => pagos[u.email]?.includes(mesActual)).length;
  const cantidadDeuda = cantidadTotal - cantidadPagosEsteMes;
  const cantidadBajasEsteMes = Object.entries(bajas).filter(
    ([email, fechas]) =>
      fechas.includes(mesActual) &&
      (sedeSeleccionada === 'todas' || usuarios.find(u => u.email === email)?.sede === sedeSeleccionada)
  ).length;

  const data = {
    labels: meses,
    datasets: [
      {
        label:
          tipoGrafico === 'altas'
            ? 'Altas nuevas'
            : tipoGrafico === 'bajas'
            ? 'Bajas'
            : 'Pagos',
        data: conteoMensual,
        backgroundColor:
          tipoGrafico === 'altas'
            ? 'rgba(59, 130, 246, 0.7)'
            : tipoGrafico === 'bajas'
            ? 'rgba(234, 88, 12, 0.7)'
            : 'rgba(22, 163, 74, 0.7)'
      }
    ]
  };

  const options = {
    responsive: true,
    plugins: { legend: { display: false } },
    scales: {
      y: {
        beginAtZero: true,
        ticks: { stepSize: 1 }
      }
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-blue-700">📊 Estadísticas del mes</h2>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-center">
        <div className="bg-white shadow p-4 rounded-lg">
            <div className="text-gray-600 text-sm">Usuarios totales</div>
            <div className="text-2xl font-bold text-gray-600">{cantidadTotal}</div>
        </div>
        <div className="bg-green-100 shadow p-4 rounded-lg">
            <div className="text-gray-600 text-sm">Pagaron este mes</div>
            <div className="text-2xl font-bold text-green-800">{cantidadPagosEsteMes}</div>
        </div>
        <div className="bg-red-100 shadow p-4 rounded-lg">
            <div className="text-gray-600 text-sm">En deuda</div>
            <div className="text-2xl font-bold text-red-800">{cantidadDeuda}</div>
        </div>
        <div className="bg-gray-200 shadow p-4 rounded-lg">
            <div className="text-gray-600 text-sm">Dados de baja</div>
            <div className="text-2xl font-bold text-gray-800">{cantidadBajasEsteMes}</div>
        </div>
      </div>

      <div className="bg-white shadow p-4 rounded-lg space-y-4">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
          <h3 className="text-lg font-semibold text-gray-800">📈 Estadísticas anuales</h3>
          <div className="flex gap-2">
            <select
              value={tipoGrafico}
              onChange={(e) => setTipoGrafico(e.target.value as any)}
              className="border rounded p-2 text-sm text-gray-800"
            >
              <option value="altas">Altas nuevas</option>
              <option value="bajas">Bajas</option>
              <option value="pagos">Pagos</option>
            </select>
            <select
              value={sedeSeleccionada}
              onChange={(e) => setSedeSeleccionada(e.target.value as any)}
              className="border rounded p-2 text-sm text-gray-800"
            >
              <option value="todas">Todas las sedes</option>
              <option value="Temperley">Temperley</option>
              <option value="Calzada">Calzada</option>
            </select>
          </div>
        </div>

        <Bar data={data} options={options} />
      </div>
    </div>
  );
}
