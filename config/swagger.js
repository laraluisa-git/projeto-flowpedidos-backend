import swaggerJSDoc from 'swagger-jsdoc';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'FlowPedidos API',
      version: '1.0.0',
      description:
        'Documentação da API do sistema FlowPedidos — gerenciamento de pedidos, produtos e autenticação.',
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Servidor local (desenvolvimento)',
      },
      {
        url: 'https://projeto-flowpedidos-api.onrender.com',
        description: 'Servidor de produção (Render)',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Insira o token JWT obtido no login. Exemplo: Bearer eyJ...',
        },
      },
      schemas: {
        // ── Auth ──────────────────────────────────────────
        LoginInput: {
          type: 'object',
          required: ['email', 'senha'],
          properties: {
            email: { type: 'string', format: 'email', example: 'admin@demo.com' },
            senha: { type: 'string', minLength: 6, example: 'admin123' },
          },
        },
        RegisterInput: {
          type: 'object',
          required: ['nome', 'email', 'senha', 'endereco', 'tipoConta'],
          properties: {
            nome:        { type: 'string', example: 'Maria Silva' },
            email:       { type: 'string', format: 'email', example: 'maria@exemplo.com' },
            senha:       { type: 'string', minLength: 6, example: 'senha123' },
            endereco:    { type: 'string', example: 'Rua das Flores, 123' },
            tipoConta:   { type: 'string', enum: ['pf', 'empresa'], example: 'pf' },
            nomeEmpresa: { type: 'string', example: '' },
          },
        },
        AuthResponse: {
          type: 'object',
          properties: {
            token: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
            usuario: {
              type: 'object',
              properties: {
                id:    { type: 'string', example: 'uuid-do-usuario' },
                name:  { type: 'string', example: 'Maria Silva' },
                email: { type: 'string', example: 'maria@exemplo.com' },
                role:  { type: 'string', example: 'user' },
              },
            },
          },
        },

        // ── Produto ───────────────────────────────────────
        ProdutoInput: {
          type: 'object',
          required: ['name', 'category', 'unitPrice', 'stockQty', 'minStockQty'],
          properties: {
            name:        { type: 'string', example: 'Cadeira Gamer' },
            category:    { type: 'string', example: 'moveis' },
            unitPrice:   { type: 'number', example: 499.90 },
            stockQty:    { type: 'integer', example: 20 },
            minStockQty: { type: 'integer', example: 5 },
            isActive:    { type: 'boolean', example: true },
          },
        },
        Produto: {
          type: 'object',
          properties: {
            id:          { type: 'string', example: 'uuid-do-produto' },
            nome:        { type: 'string', example: 'Cadeira Gamer' },
            categoria:   { type: 'string', example: 'moveis' },
            unit_price:  { type: 'number', example: 499.90 },
            stock_qty:   { type: 'integer', example: 20 },
            min_stock_qty: { type: 'integer', example: 5 },
            is_active:   { type: 'boolean', example: true },
            criadoEm:    { type: 'integer', example: 1700000000000 },
            atualizadoEm: { type: 'integer', example: 1700000000000 },
          },
        },

        // ── Pedido ────────────────────────────────────────
        PedidoInput: {
          type: 'object',
          required: ['customerName', 'deliveryAddress', 'productId', 'quantity'],
          properties: {
            customerName:    { type: 'string', example: 'João Costa' },
            deliveryAddress: { type: 'string', example: 'Av. Principal, 456' },
            productId:       { type: 'string', format: 'uuid', example: 'uuid-do-produto' },
            quantity:        { type: 'integer', minimum: 1, example: 2 },
            priority:        { type: 'string', enum: ['baixa', 'media', 'alta'], example: 'media' },
            status:          { type: 'string', enum: ['confirmado', 'em_andamento', 'entregue'], example: 'confirmado' },
          },
        },
        Pedido: {
          type: 'object',
          properties: {
            id:              { type: 'string', example: 'uuid-do-pedido' },
            customerName:    { type: 'string', example: 'João Costa' },
            deliveryAddress: { type: 'string', example: 'Av. Principal, 456' },
            productId:       { type: 'string', example: 'uuid-do-produto' },
            productName:     { type: 'string', example: 'Cadeira Gamer' },
            quantity:        { type: 'integer', example: 2 },
            priority:        { type: 'string', example: 'media' },
            status:          { type: 'string', example: 'confirmado' },
            criadoEm:        { type: 'integer', example: 1700000000000 },
            entregaEm:       { type: 'integer', nullable: true, example: null },
          },
        },

        // ── Erros ─────────────────────────────────────────
        ErroGenerico: {
          type: 'object',
          properties: {
            error:   { type: 'string', example: 'Mensagem de erro.' },
            details: { type: 'string', example: 'Detalhes técnicos do erro.' },
          },
        },
        ErroValidacao: {
          type: 'object',
          properties: {
            errors: {
              type: 'array',
              items: { type: 'string' },
              example: ['Campo obrigatório ausente.'],
            },
          },
        },
      },
    },
  },
  // Arquivos onde o swagger-jsdoc vai procurar as anotações @swagger
  apis: ['./routes/authRoutes.js', './routes/produtoRoutes.js', './routes/pedidoRoutes.js'],
};

const swaggerSpec = swaggerJSDoc(options);

export default swaggerSpec;
