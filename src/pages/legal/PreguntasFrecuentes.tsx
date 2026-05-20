import LegalLayout from "@/components/waterpark/LegalLayout";

export default function PreguntasFrecuentes() {
  return (
    <LegalLayout title="PREGUNTAS FRECUENTES">
      <h2>Fecha de apertura</h2>
      <p>
        El parque abrirá sus puertas en enero de 2026. La fecha exacta será comunicada primero a quienes compren en preventa y luego publicada en las redes oficiales de Infinito Water Park.
      </p>

      <h2>Beneficios de comprar en preventa</h2>
      <p>Uniéndote a la preventa accedés a beneficios que solo van a tener los primeros:</p>
      <ul>
        <li>Programa de descuentos en tus próximas visitas.</li>
        <li>Financiación hasta en 9 cuotas sin interés.</li>
        <li>Uso flexible: si lo necesitas podés reagendar tu visita dentro de los 15 días posteriores a la compra.</li>
        <li>Seguro de lluvia: si llueve durante los primeros 30 minutos de tu ingreso, podés reprogramar tu entrada sin costo para otro día.</li>
      </ul>

      <h2>Registro gratuito</h2>
      <p>
        Registrarte es 100% gratis, sin compromiso y te asegura recibir antes que nadie las novedades, fechas, beneficios y cupos de la preventa.
      </p>

      <h2>Cancelación inmediata</h2>
      <p>Podés darte de baja en cualquier momento, de manera fácil y sin complicaciones.</p>

      <h2>Recepción de entradas</h2>
      <p>
        Vas a recibir tu entrada en formato QR a través del correo{" "}
        <a href="mailto:entradas@infinitowaterpark.com">
          <strong>entradas@infinitowaterpark.com</strong>
        </a>
      </p>
    </LegalLayout>
  );
}
