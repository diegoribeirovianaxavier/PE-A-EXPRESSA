'use client';

import React from 'react';
import { Modal, Button, Space, Typography, Empty, Image } from 'antd';
import { DownloadOutlined, LinkOutlined, FilePdfOutlined, EyeOutlined } from '@ant-design/icons';

const { Text } = Typography;

interface InvoiceViewerModalProps {
  visible: boolean;
  onClose: () => void;
  fileUrl?: string;
  invoiceNumber?: string;
  clientName?: string;
}

export const InvoiceViewerModal: React.FC<InvoiceViewerModalProps> = ({
  visible,
  onClose,
  fileUrl,
  invoiceNumber,
  clientName,
}) => {
  const isPdf = fileUrl?.toLowerCase().endsWith('.pdf') || fileUrl?.startsWith('data:application/pdf');

  return (
    <Modal
      open={visible}
      onCancel={onClose}
      title={
        <Space>
          <EyeOutlined className="text-orange-500" />
          <span>Comprovante / Nota Fiscal: <strong>{invoiceNumber || 'Documento Anexo'}</strong></span>
          {clientName && <Text type="secondary" className="text-xs">({clientName})</Text>}
        </Space>
      }
      footer={[
        <Button key="close" onClick={onClose}>
          Fechar
        </Button>,
        fileUrl ? (
          <Button
            key="download"
            type="primary"
            icon={<DownloadOutlined />}
            href={fileUrl}
            target="_blank"
            download
            className="!bg-orange-500 hover:!bg-orange-600"
          >
            Baixar Documento
          </Button>
        ) : null,
      ]}
      width={780}
      centered
      destroyOnClose
    >
      <div className="min-h-[350px] max-h-[600px] flex items-center justify-center p-4 bg-slate-900 rounded-lg overflow-auto">
        {!fileUrl ? (
          <Empty
            description={<span className="text-slate-400">Nenhum arquivo ou comprovante anexado a esta venda.</span>}
          />
        ) : isPdf ? (
          <div className="text-center text-white py-12">
            <FilePdfOutlined className="text-6xl text-red-400 mb-4" />
            <div className="text-lg font-medium mb-3">Documento em Formato PDF</div>
            <Button
              type="primary"
              icon={<LinkOutlined />}
              href={fileUrl}
              target="_blank"
              size="large"
              className="!bg-red-600 hover:!bg-red-700"
            >
              Abrir PDF em Nova Aba
            </Button>
          </div>
        ) : (
          <div className="flex justify-center items-center w-full">
            <Image
              src={fileUrl}
              alt="Nota Fiscal"
              className="max-h-[500px] max-w-full object-contain rounded"
              fallback="https://via.placeholder.com/600x400?text=Imagem+N%C3%A3o+Dispon%C3%ADvel"
            />
          </div>
        )}
      </div>
    </Modal>
  );
};
