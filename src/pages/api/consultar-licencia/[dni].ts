import type { APIRoute } from 'astro';

// Deterministic mock database matching DNI mock profiles
const mockLicenciaData = (dni: string) => {
  const names = [
    { nombres: 'Juan Carlos', apPaterno: 'Perez', apMaterno: 'Gomez', cat: 'A-I', nLic: 'Q12345678', exp: '15/05/2020', ven: '15/05/2030', est: 'ACTIVA', restr: 'NINGUNA' },
    { nombres: 'Maria Elena', apPaterno: 'Rodriguez', apMaterno: 'Quispe', cat: 'A-IIa', nLic: 'Q87654321', exp: '22/09/2021', ven: '22/09/2026', est: 'ACTIVA', restr: 'USO DE LENTES' },
    { nombres: 'Luis Alberto', apPaterno: 'Sanchez', apMaterno: 'Flores', cat: 'A-I', nLic: 'Q45678901', exp: '02/11/2019', ven: '02/11/2029', est: 'ACTIVA', restr: 'NINGUNA' },
    { nombres: 'Ana Sofia', apPaterno: 'Castro', apMaterno: 'Chavez', cat: 'A-I', nLic: 'Q23456789', exp: '18/02/2022', ven: '18/02/2032', est: 'ACTIVA', restr: 'USO DE LENTES' },
    { nombres: 'Jose Manuel', apPaterno: 'Diaz', apMaterno: 'Torres', cat: 'A-IIIb', nLic: 'Q90123456', exp: '30/07/2023', ven: '30/07/2028', est: 'ACTIVA', restr: 'NINGUNA' }
  ];
  
  const sum = dni.split('').reduce((acc, char) => acc + parseInt(char || '0'), 0);
  const index = sum % names.length;
  const person = names[index];
  const nombreCompleto = `${person.apPaterno} ${person.apMaterno} ${person.nombres}`;
  
  return {
    success: true,
    estado: 'ACTIVA',
    mensaje: 'Licencia encontrada',
    data: {
      nombre_completo: nombreCompleto,
      licencia: {
        numero: person.nLic,
        categoria: person.cat,
        fecha_expedicion: person.exp,
        fecha_vencimiento: person.ven,
        estado: person.est,
        restricciones: person.restr
      }
    }
  };
};

export const GET: APIRoute = async ({ params }) => {
  const { dni } = params;

  if (!dni || !/^\d{8}$/.test(dni)) {
    return new Response(JSON.stringify({
      success: false,
      message: 'El DNI debe tener exactamente 8 dígitos numéricos'
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const apiUrl = process.env.FACTILIZA_API_URL || import.meta.env.FACTILIZA_API_URL || 'https://api.factiliza.com/v1';
  const apiToken = process.env.FACTILIZA_API_TOKEN || import.meta.env.FACTILIZA_API_TOKEN;

  if (!apiToken || apiToken === 'your-supabase-anon-key' || apiToken.includes('your_')) {
    console.log(`[API] Licencia ${dni} - Usando Datos Mockups (Falta Token Factiliza)`);
    return new Response(JSON.stringify(mockLicenciaData(dni)), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const response = await fetch(`${apiUrl}/licencia/info/${dni}`, {
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Servidor Factiliza respondió con código ${response.status}`);
    }

    const data = await response.json();
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.warn(`[API] Falló consulta Licencia ${dni} en Factiliza. Usando fallback Mock. Motivo:`, error.message);
    return new Response(JSON.stringify(mockLicenciaData(dni)), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
