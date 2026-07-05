/**
 * Mail-notifikation ved nyt lead.
 * Uden SMTP-config bruges nodemailers jsonTransport, saa mailen logges (og
 * intet fejler) i udvikling. I produktion saettes SMTP_* i env.
 */
import nodemailer from 'nodemailer';

export function createMailer(config) {
  const { smtp } = config;
  const useSmtp = Boolean(smtp.host);

  const transport = useSmtp
    ? nodemailer.createTransport({
        host: smtp.host,
        port: smtp.port,
        secure: smtp.secure,
        auth: smtp.user ? { user: smtp.user, pass: smtp.pass } : undefined,
      })
    : nodemailer.createTransport({ jsonTransport: true });

  return {
    usingSmtp: useSmtp,

    async sendLeadNotification(lead) {
      if (!config.leadEmailTo) {
        return { skipped: true, reason: 'LEAD_EMAIL_TO ikke sat' };
      }
      const kr = (n) => new Intl.NumberFormat('da-DK', { maximumFractionDigits: 0 }).format(Math.round(n));
      const valgt = lead.valg
        .filter((v) => v.active)
        .map((v) => ` - ${v.navn}: ${v.qty} ${v.enhedKort} · ${v.freq}x/aar`)
        .join('\n');

      const text = [
        `Nyt lead fra tilbudsmotoren (ref ${lead.ref})`,
        '',
        `Navn:    ${lead.kontakt.navn}`,
        `E-mail:  ${lead.kontakt.email}`,
        `Telefon: ${lead.kontakt.tlf || '-'}`,
        `Adresse: ${lead.adresse.betegnelse}`,
        '',
        'Valgte ydelser:',
        valgt || ' (ingen)',
        '',
        `Estimat: ${kr(lead.quote.monthlyInclMoms)} kr/md inkl. moms ` +
          `(${kr(lead.quote.annualInclMoms)} kr/aar), ${lead.quote.count} ydelser, ` +
          `${lead.quote.minVisits}-${lead.quote.maxVisits} besoeg/aar.`,
        '',
        lead.kontakt.note ? `Besked: ${lead.kontakt.note}` : '',
        '',
        'NB: Priser er estimat baseret paa kundens egne maal. Ring og bekraeft.',
      ].join('\n');

      const info = await transport.sendMail({
        from: config.leadEmailFrom,
        to: config.leadEmailTo,
        subject: `Nyt havelead: ${lead.kontakt.navn} - ${kr(lead.quote.monthlyInclMoms)} kr/md`,
        text,
        replyTo: lead.kontakt.email,
      });

      if (!useSmtp) {
        // jsonTransport: gør mailen synlig i loggen under udvikling.
        console.log('[mailer] (dev, ikke sendt) lead-notifikation:', info.message?.toString?.() || info.message);
      }
      return { skipped: false, messageId: info.messageId };
    },
  };
}
