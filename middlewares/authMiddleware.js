import jwt from "jsonwebtoken";
import supabase from "../config/supabase.js"; // ✅ ADICIONE ISSO

export const verificarToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: "Token ausente. Faça login novamente." });

  const [, token] = authHeader.split(" ");
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    return next();
  } catch (error) {
    return res.status(401).json({ error: "Token inválido ou expirado." });
  }
};

const ADMIN_EMAILS = ["admin@demo.com"].map((e) => e.toLowerCase());

export async function verificarAdmin(req, res, next) {
  try {
    // 1) tenta pelo token (se tiver email)
    const tokenEmail = (req.user?.email || "").toLowerCase();
    if (tokenEmail && ADMIN_EMAILS.includes(tokenEmail)) return next();

    // 2) fallback: busca no banco pelo ID do token (mais confiável)
    const userId = req.user?.id;
    if (!userId) {
      return res.status(403).json({ error: "Acesso negado. Requer privilégios de administrador." });
    }

    const { data: user, error } = await supabase
      .from("usuarios")
      .select("email, role")
      .eq("id", userId)
      .maybeSingle();

    if (error) throw error;

    const emailDb = (user?.email || "").toLowerCase();
    const isAdmin = ADMIN_EMAILS.includes(emailDb) || user?.role === "admin";

    if (!isAdmin) {
      return res.status(403).json({ error: "Acesso negado. Requer privilégios de administrador." });
    }

    return next();
  } catch (err) {
    return res.status(500).json({ error: "Erro ao validar admin.", details: err.message });
  }
}