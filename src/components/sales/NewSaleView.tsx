'use client';

import React, { useState, useMemo } from 'react';
import {
  Card,
  Form,
  Input,
  Select,
  Button,
  Upload,
  Space,
  Row,
  Col,
  Typography,
  message,
  notification,
  Alert,
  Spin,
  Radio,
  Tag,
  Divider,
} from 'antd';
import {
  InboxOutlined,
  ThunderboltOutlined,
  SaveOutlined,
  ReloadOutlined,
  CheckCircleOutlined,
  FileImageOutlined,
  RobotOutlined,
  UserOutlined,
  PhoneOutlined,
  CarOutlined,
  BarcodeOutlined,
} from '@ant-design/icons';
import confetti from 'canvas-confetti';
import { ItemsEditableTable } from './ItemsEditableTable';
import { PricingSummaryCard } from './PricingSummaryCard';
import { WhatsAppQuoteCard } from './WhatsAppQuoteCard';
import { PricingEngine } from '@/lib/pricing/PricingEngine';
import { SalesService } from '@/lib/supabase/salesService';
import { PaymentMethod, SaleItemInput } from '@/lib/types';
import { formatPhone, cleanProductCode, dayjs } from '@/lib/formatters';

const { Title, Text, Paragraph } = Typography;
const { Dragger } = Upload;

interface NewSaleViewProps {
  onSaleSaved?: () => void;
}

export const NewSaleView: React.FC<NewSaleViewProps> = ({ onSaleSaved }) => {
  const [form] = Form.useForm();
  
  // Estados do formulário
  const [fileList, setFileList] = useState<any[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isOcrProcessing, setIsOcrProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [ocrSuccess, setOcrSuccess] = useState(false);
  
  // Itens da venda
  const [items, setItems] = useState<SaleItemInput[]>([
    {
      id: 'item-1',
      item_code: '',
      item_name: '',
      brand: '',
      quantity: 1,
      original_unit_cost: 0,
    },
  ]);

  // Forma de pagamento
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('PIX');
  const [installmentsCount, setInstallmentsCount] = useState<number>(1);
  const [invoiceNumber, setInvoiceNumber] = useState<string>('');
  const [clientPhone, setClientPhone] = useState<string>('');

  // Cálculo reativo em tempo real via PricingEngine
  const pricingCalculation = useMemo(() => {
    return PricingEngine.calculate(items, paymentMethod);
  }, [items, paymentMethod]);

  // Processamento de OCR com a API Gemini Vision
  const handleProcessOcr = async () => {
    if (!selectedFile) {
      message.warning('Por favor, selecione ou arraste uma foto ou PDF da nota fiscal primeiro.');
      return;
    }

    setIsOcrProcessing(true);
    setOcrSuccess(false);

    try {
      // Converte o arquivo para Base64
      const reader = new FileReader();
      const fileDataPromise = new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(selectedFile);
      });

      const base64Data = await fileDataPromise;
      const mimeType = selectedFile.type || 'image/jpeg';

      const response = await fetch('/api/gemini/ocr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: base64Data,
          mimeType: mimeType,
          fileName: selectedFile.name,
        }),
      });

      const resJson = await response.json();

      if (!response.ok || !resJson.success) {
        throw new Error(resJson.error || 'Erro ao processar imagem da nota.');
      }

      const extracted = resJson.data;

      // Preenche os campos do formulário automaticamente
      form.setFieldsValue({
        original_invoice_number: extracted.original_invoice_number || '',
        client_name: extracted.client_name || form.getFieldValue('client_name') || '',
        client_phone: formatPhone(extracted.client_phone || form.getFieldValue('client_phone') || ''),
        car_model: extracted.car_model || form.getFieldValue('car_model') || '',
        notes: extracted.notes || form.getFieldValue('notes') || '',
      });

      if (extracted.original_invoice_number) {
        setInvoiceNumber(extracted.original_invoice_number);
      }
      if (extracted.client_phone) {
        setClientPhone(extracted.client_phone);
      }

      // Preenche a tabela de itens
      if (extracted.items && extracted.items.length > 0) {
        const mappedItems: SaleItemInput[] = extracted.items.map((it: any, idx: number) => ({
          id: `item-${Date.now()}-${idx}`,
          item_code: cleanProductCode(it.item_code),
          item_name: it.item_name || 'Peça Automotiva',
          brand: it.brand || 'Original',
          quantity: Number(it.quantity) || 1,
          original_unit_cost: Number(it.original_unit_cost) || 0,
        }));
        setItems(mappedItems);
      }

      setOcrSuccess(true);
      if (resJson.isMock) {
        notification.info({
          message: 'Extração Concluída (Modo Demonstração)',
          description: 'A nota foi lida com sucesso! Configure a GEMINI_API_KEY no .env para OCR real em produção.',
          placement: 'topRight',
        });
      } else {
        notification.success({
          message: 'Nota Processada com Sucesso!',
          description: `IA do Gemini extraiu ${extracted.items?.length || 0} itens e dados da nota fiscal.`,
          placement: 'topRight',
        });
      }
    } catch (err: any) {
      console.error(err);
      notification.error({
        message: 'Falha no OCR',
        description: err.message || 'Não foi possível ler o arquivo. Você pode preencher os campos manualmente.',
        placement: 'topRight',
      });
    } finally {
      setIsOcrProcessing(false);
    }
  };

  // Salvar Venda no Supabase / Local DB
  const handleSaveSale = async () => {
    try {
      const values = await form.validateFields();

      if (!items || items.length === 0) {
        message.error('Adicione ao menos um item/peça na venda.');
        return;
      }

      const hasInvalidItem = items.some(
        it => !it.item_name || it.quantity <= 0 || it.original_unit_cost <= 0
      );

      if (hasInvalidItem) {
        message.error('Preencha a descrição, quantidade e custo de todos os itens.');
        return;
      }

      setIsSaving(true);

      const saleDate = dayjs().format('YYYY-MM-DD');
      const warrantyDeadline = dayjs().add(90, 'day').format('YYYY-MM-DD');

      const salePayload = {
        sale_date: saleDate,
        original_invoice_number: values.original_invoice_number || '',
        client_name: values.client_name,
        client_phone: values.client_phone || '',
        car_model: values.car_model || '',
        payment_method: paymentMethod,
        installments_count: paymentMethod === 'CARTAO' ? installmentsCount : 1,
        original_cost_total: pricingCalculation.original_cost_total,
        profit_margin_percent: pricingCalculation.profit_margin_percent,
        freight_cost: pricingCalculation.freight_cost,
        card_fee_percent: pricingCalculation.card_fee_percent,
        pix_discount_percent: pricingCalculation.pix_discount_percent,
        final_sale_total: pricingCalculation.final_sale_total,
        net_profit: pricingCalculation.net_profit,
        warranty_deadline: warrantyDeadline,
        status: 'CONCLUIDO' as const,
        notes: values.notes || '',
      };

      await SalesService.createSale(
        salePayload,
        pricingCalculation.items,
        selectedFile || undefined
      );

      // Animação de confete ao concluir a venda
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
        });
      } catch {}

      notification.success({
        message: 'Venda Registrada com Sucesso!',
        description: `Ordem gravada no sistema. Garantia de 90 dias ativa até ${dayjs(warrantyDeadline).format('DD/MM/YYYY')}.`,
        placement: 'topRight',
      });

      // Notifica o componente pai
      if (onSaleSaved) {
        onSaleSaved();
      }

      // Reset parcial do formulário para nova venda
      form.resetFields();
      setFileList([]);
      setSelectedFile(null);
      setOcrSuccess(false);
      setItems([
        {
          id: `item-${Date.now()}`,
          item_code: '',
          item_name: '',
          brand: 'Original',
          quantity: 1,
          original_unit_cost: 0,
        },
      ]);
    } catch (err: any) {
      if (err.errorFields) {
        message.warning('Por favor, preencha todos os campos obrigatórios do formulário.');
      } else {
        message.error(`Erro ao salvar venda: ${err.message || 'Erro desconhecido'}`);
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200">
        <div>
          <Title level={3} className="!mb-0 text-slate-800 flex items-center gap-2">
            <ThunderboltOutlined className="text-orange-500" />
            Nova Venda & OCR de Nota Fiscal
          </Title>
          <Text type="secondary" className="text-sm">
            Faça upload da nota fiscal bruta da loja física ou preencha os itens para precificação automática.
          </Text>
        </div>
        <Space>
          <Button
            type="primary"
            size="large"
            icon={<SaveOutlined />}
            loading={isSaving}
            onClick={handleSaveSale}
            className="!bg-orange-500 hover:!bg-orange-600 shadow-md font-bold px-6"
          >
            Salvar Venda
          </Button>
        </Space>
      </div>

      <Row gutter={[20, 20]}>
        {/* Coluna Esquerda: Upload, OCR e Dados */}
        <Col xs={24} lg={15} className="space-y-6">
          {/* Módulo de Upload e OCR com Gemini */}
          <Card
            title={
              <Space>
                <RobotOutlined className="text-orange-500 text-lg" />
                <span className="font-bold text-slate-800">1. Upload & Leitura com IA (Gemini Vision)</span>
              </Space>
            }
            className="border-slate-200 shadow-sm"
          >
            <Dragger
              name="file"
              multiple={false}
              fileList={fileList}
              accept=".jpg,.jpeg,.png,.webp,.pdf"
              beforeUpload={(file) => {
                setSelectedFile(file);
                setFileList([file]);
                return false; // Impede upload automático do AntD
              }}
              onRemove={() => {
                setSelectedFile(null);
                setFileList([]);
                setOcrSuccess(false);
              }}
              className="bg-slate-50 hover:border-orange-400 p-4 rounded-xl"
            >
              <p className="ant-upload-drag-icon text-orange-500 mb-2">
                <InboxOutlined style={{ fontSize: '36px' }} />
              </p>
              <p className="ant-upload-text text-sm font-semibold text-slate-700">
                Clique ou arraste a Foto ou PDF da Nota Fiscal aqui
              </p>
              <p className="ant-upload-hint text-xs text-slate-400">
                Suporta JPG, PNG, WebP e PDF de cupons ou notas da loja física (&ldquo;NOVA PEÇAS&rdquo;)
              </p>
            </Dragger>

            <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-3">
              <Button
                type="primary"
                icon={<ThunderboltOutlined />}
                size="middle"
                loading={isOcrProcessing}
                disabled={!selectedFile}
                onClick={handleProcessOcr}
                className="!bg-slate-900 hover:!bg-slate-800 font-semibold w-full sm:w-auto"
              >
                {isOcrProcessing ? 'Lendo Nota com IA...' : 'Processar Nota com IA'}
              </Button>

              {ocrSuccess && (
                <Tag color="success" icon={<CheckCircleOutlined />} className="py-1 px-3 text-xs">
                  Dados extraídos com sucesso!
                </Tag>
              )}
            </div>
          </Card>

          {/* Formulário de Dados do Cliente e Nota */}
          <Card
            title={
              <Space>
                <UserOutlined className="text-orange-500" />
                <span className="font-bold text-slate-800">2. Dados do Cliente & Nota Fiscal</span>
              </Space>
            }
            className="border-slate-200 shadow-sm"
          >
            <Form
              form={form}
              layout="vertical"
              initialValues={{
                original_invoice_number: '',
                client_name: '',
                client_phone: '',
                car_model: '',
              }}
            >
              <Row gutter={16}>
                <Col xs={24} sm={12}>
                  <Form.Item
                    label="Nome do Cliente"
                    name="client_name"
                    rules={[{ required: true, message: 'Informe o nome do cliente' }]}
                  >
                    <Input
                      prefix={<UserOutlined className="text-slate-400" />}
                      placeholder="Ex: Carlos Eduardo Silva"
                    />
                  </Form.Item>
                </Col>

                <Col xs={24} sm={12}>
                  <Form.Item label="Telefone / WhatsApp" name="client_phone">
                    <Input
                      prefix={<PhoneOutlined className="text-slate-400" />}
                      placeholder="Ex: (21) 98765-4321"
                      onChange={(e) => {
                        const formatted = formatPhone(e.target.value);
                        form.setFieldValue('client_phone', formatted);
                        setClientPhone(formatted);
                      }}
                    />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col xs={24} sm={12}>
                  <Form.Item label="Veículo / Modelo / Ano" name="car_model">
                    <Input
                      prefix={<CarOutlined className="text-slate-400" />}
                      placeholder="Ex: Honda Civic 2.0 2018"
                    />
                  </Form.Item>
                </Col>

                <Col xs={24} sm={12}>
                  <Form.Item label="Nº da Nota Original (Loja Física)" name="original_invoice_number">
                    <Input
                      prefix={<BarcodeOutlined className="text-slate-400" />}
                      placeholder="Ex: NF-89421 ou Pedido 1042"
                      onChange={(e) => setInvoiceNumber(e.target.value)}
                    />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col xs={24} sm={14}>
                  <div className="mb-2">
                    <Text strong className="text-slate-700 block mb-1 text-xs">
                      Forma de Pagamento Escolhida
                    </Text>
                    <Radio.Group
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      buttonStyle="solid"
                      className="w-full"
                    >
                      <Radio.Button value="PIX" className="w-1/2 text-center font-bold">
                        ⚡ PIX (Com Desconto)
                      </Radio.Button>
                      <Radio.Button value="CARTAO" className="w-1/2 text-center font-bold">
                        💳 Cartão de Crédito
                      </Radio.Button>
                    </Radio.Group>
                  </div>
                </Col>

                {paymentMethod === 'CARTAO' && (
                  <Col xs={24} sm={10}>
                    <div className="mb-2">
                      <Text strong className="text-slate-700 block mb-1 text-xs">
                        Número de Parcelas Sem Juros
                      </Text>
                      <Select
                        value={installmentsCount}
                        onChange={(v) => setInstallmentsCount(v)}
                        className="w-full"
                        options={Array.from({ length: pricingCalculation.max_installments }, (_, i) => ({
                          value: i + 1,
                          label: `${i + 1}x de ${PricingEngine.calculate(items, 'CARTAO').installment_value ? (pricingCalculation.card_sale_total / (i + 1)).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : 'R$ 0,00'}`,
                        }))}
                      />
                    </div>
                  </Col>
                )}
              </Row>

              <Form.Item label="Observações Internas (Opcional)" name="notes" className="!mb-0">
                <Input.TextArea
                  rows={2}
                  placeholder="Ex: Cliente solicitou entrega rápida via motoboy no bairro Tijuca."
                />
              </Form.Item>
            </Form>
          </Card>

          {/* Tabela de Itens */}
          <Card className="border-slate-200 shadow-sm">
            <ItemsEditableTable
              items={items}
              calculatedItems={pricingCalculation.items}
              onChange={(newItems) => setItems(newItems)}
            />
          </Card>
        </Col>

        {/* Coluna Direita: Motor de Precificação & Orçamento WhatsApp */}
        <Col xs={24} lg={9} className="space-y-6">
          {/* Card do Motor de Precificação */}
          <PricingSummaryCard
            calculation={pricingCalculation}
            paymentMethod={paymentMethod}
          />

          {/* Card do Orçamento Formatado para WhatsApp */}
          <WhatsAppQuoteCard
            calculation={pricingCalculation}
            invoiceNumber={invoiceNumber}
            clientPhone={clientPhone}
          />

          {/* Botão de Gravação de Venda */}
          <div className="pt-2">
            <Button
              type="primary"
              size="large"
              block
              icon={<SaveOutlined />}
              loading={isSaving}
              onClick={handleSaveSale}
              className="!bg-orange-500 hover:!bg-orange-600 !h-14 text-base font-bold shadow-lg rounded-xl"
            >
              Gravar Venda no Sistema
            </Button>
            <Text type="secondary" className="block text-center text-xs mt-2">
              🛡️ Ao salvar, o prazo de garantia de 90 dias é iniciado automaticamente.
            </Text>
          </div>
        </Col>
      </Row>
    </div>
  );
};
