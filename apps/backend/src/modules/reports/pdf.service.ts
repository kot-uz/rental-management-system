import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { notFound } from '../../shared/errors/domain.error';

// pdfkit is an `export =` CommonJS module; import-equals avoids the broken
// `.default` access that a default import emits without esModuleInterop.
import PDFDocument = require('pdfkit');

@Injectable()
export class PdfService {
  constructor(private prisma: PrismaService) {}

  /** Renders a one-page rent-payment receipt as a PDF buffer. */
  async paymentReceipt(paymentId: string, orgId: string): Promise<Buffer> {
    const payment = await this.prisma.payment.findFirst({
      where: { id: paymentId, orgId },
      include: {
        org: { select: { name: true, currency: true } },
        rentPeriod: {
          include: {
            lease: {
              include: {
                apartment: { select: { address: true, unitNumber: true } },
                parties: {
                  where: { isPrimary: true },
                  include: { tenant: { select: { firstName: true, lastName: true } } },
                },
              },
            },
          },
        },
      },
    });
    if (!payment) throw notFound('Payment', paymentId);

    const { org, rentPeriod } = payment;
    const apt = rentPeriod.lease.apartment;
    const tenant = rentPeriod.lease.parties[0]?.tenant;
    const currency = org.currency || 'USD';
    const money = (v: unknown) =>
      `${currency} ${Number(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    const balance = Math.max(Number(rentPeriod.expectedAmount) - Number(rentPeriod.paidAmount), 0);

    return this.build((doc) => {
      // Header
      doc.fontSize(20).font('Helvetica-Bold').text(org.name || 'RentManager', { align: 'left' });
      doc.moveDown(0.2);
      doc.fontSize(16).fillColor('#555').text('Payment Receipt');
      doc.fillColor('#000');
      doc.moveDown(0.5);
      doc
        .fontSize(9)
        .fillColor('#888')
        .text(`Receipt #${payment.id.slice(0, 8).toUpperCase()}`)
        .text(`Issued: ${new Date().toISOString().slice(0, 10)}`);
      doc.fillColor('#000');

      // Divider
      doc.moveDown(0.5);
      doc.moveTo(doc.x, doc.y).lineTo(555, doc.y).strokeColor('#ddd').stroke();
      doc.moveDown(0.8);

      const row = (label: string, value: string) => {
        const y = doc.y;
        doc.fontSize(10).font('Helvetica-Bold').fillColor('#444').text(label, 50, y, { width: 180 });
        doc.font('Helvetica').fillColor('#000').text(value, 240, y, { width: 315 });
        doc.moveDown(0.6);
      };

      row('Tenant', tenant ? `${tenant.firstName} ${tenant.lastName}` : '—');
      row('Apartment', apt ? `${apt.address}${apt.unitNumber ? ` · ${apt.unitNumber}` : ''}` : '—');
      row('Period', `${rentPeriod.periodYear}-${String(rentPeriod.periodMonth).padStart(2, '0')}`);
      row('Payment date', payment.paymentDate.toISOString().slice(0, 10));
      row('Method', payment.method);
      if (payment.note) row('Note', payment.note);

      doc.moveDown(0.4);
      doc.moveTo(50, doc.y).lineTo(555, doc.y).strokeColor('#ddd').stroke();
      doc.moveDown(0.8);

      row('Amount paid', money(payment.amount));
      row('Period expected', money(rentPeriod.expectedAmount));
      row('Period paid to date', money(rentPeriod.paidAmount));
      row('Remaining balance', money(balance));

      doc.moveDown(0.4);
      const y = doc.y;
      doc.fontSize(12).font('Helvetica-Bold').text('Status', 50, y, { width: 180 });
      doc.fillColor(rentPeriod.status === 'PAID' ? '#2e7d32' : '#ed6c02').text(rentPeriod.status, 240, y);
      doc.fillColor('#000');

      // Footer
      doc.fontSize(8).fillColor('#aaa').text(
        'This receipt was generated automatically by RentManager.',
        50,
        760,
        { align: 'center', width: 505 },
      );
    });
  }

  private build(draw: (doc: PDFKit.PDFDocument) => void): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const chunks: Buffer[] = [];
      doc.on('data', (c: Buffer) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
      try {
        draw(doc);
        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }
}
