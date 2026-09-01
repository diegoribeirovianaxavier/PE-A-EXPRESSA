'use client';

import React, { useState } from 'react';
import { Card, Button, Space, message, Tooltip, Typography } from 'antd';
import {
  CopyOutlined,
  WhatsAppOutlined,
  CheckOutlined,
  ShareAltOutlined,
} from '@ant-design/icons';
import { PricingCalculationResult } from '@/lib/types';
import { generateWhatsAppQuoteText, getWhatsAppUrl } from '@/lib/formatters';

const { Text } = Typography;

interface WhatsAppQuoteCardProps {
  calculation: PricingCalculationResult;
  invoiceNumber?: string;
  clientPhone?: string;
  sellerPhone?: string;
}

export const WhatsAppQuoteCard: React.FC<WhatsAppQuoteCardProps> = ({
  calculation,
  invoiceNumber = '',
  clientPhone = '',
  sellerPhone = '(21) 97690-4912',
}) => {
  const [copied, setCopied] = useState(false);

  const quoteText = generateWhatsAppQuoteText(
    calculation,
    invoiceNumber || 'S/N',
    sellerPhone
  );

  const handleCopy = async () => {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(quoteText);
      } else {
        // Fallback para navegadores sem clipboard API
        const textArea = document.createElement('textarea');
        textArea.value = quoteText;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setCopied(true);
      message.success('Orçamento copiado com sucesso! Pronto para colar no WhatsApp.');
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      message.error('Não foi possível copiar automaticamente. Selecione e copie o texto abaixo.');
    }
  };

  const handleOpenWhatsApp = () => {
    if (!clientPhone) {
      message.warning('Informe o telefone/WhatsApp do cliente para abrir a conversa direta.');
      return;
    }
    const url = getWhatsAppUrl(clientPhone, quoteText);
    window.open(url, '_blank');
  };

  return (
    <Card
      title={
        <div className="flex items-center justify-between">
          <Space>
            <WhatsAppOutlined className="text-emerald-500 text-xl" />
            <span className="font-bold text-slate-800">Orçamento Formatado (WhatsApp)</span>
          </Space>
          <span className="text-xs bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md font-medium">
            Padrão Oficial Peça Expressa
          </span>
        </div>
      }
      extra={
        <Space>
          <Button
            type="primary"
            icon={copied ? <CheckOutlined /> : <CopyOutlined />}
            onClick={handleCopy}
            className={copied ? '!bg-emerald-600' : '!bg-emerald-600 hover:!bg-emerald-700'}
          >
            {copied ? 'Copiado!' : 'Copiar Orçamento'}
          </Button>
          {clientPhone && (
            <Tooltip title="Abrir conversa no WhatsApp Web com o orçamento pré-preenchido">
              <Button
                icon={<WhatsAppOutlined />}
                onClick={handleOpenWhatsApp}
                className="border-emerald-500 text-emerald-700 hover:bg-emerald-50"
              >
                Enviar no WhatsApp
              </Button>
            </Tooltip>
          )}
        </Space>
      }
      className="shadow-sm border-slate-200"
    >
      <div className="relative">
        <pre className="whatsapp-preview-box p-4 rounded-lg font-mono text-xs text-slate-800 border border-[#d2c8bc] whitespace-pre-wrap leading-relaxed select-all shadow-inner overflow-x-auto">
          {quoteText}
        </pre>
        <div className="mt-2 text-right">
          <Text type="secondary" className="text-[11px]">
            💡 Clique no botão &ldquo;Copiar Orçamento&rdquo; ou selecione o texto acima para enviar ao cliente.
          </Text>
        </div>
      </div>
    </Card>
  );
};
