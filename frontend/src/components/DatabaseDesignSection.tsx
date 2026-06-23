import React, { useState } from "react";
import { Database, BookOpen, Code2, GitBranch, Copy, Check, ChevronDown, ChevronRight } from "lucide-react";

type DbTab = "erd" | "dict" | "script" | "mapping";

// ── ERD data ──────────────────────────────────────────────────────────────
interface ErdField { name: string; type: string; constraint?: "PK" | "FK" | "UK"; }
interface ErdEntity { id: string; x: number; y: number; w: number; domain: "auth" | "clinical" | "reference" | "ml"; fields: ErdField[]; }

const ROW_H = 18;
const HDR_H = 28;
const entityH = (e: ErdEntity) => HDR_H + e.fields.length * ROW_H;

const DOMAIN_COLORS: Record<string, { fill: string; light: string }> = {
  auth:      { fill: "#0891B2", light: "#BAE6FD" },
  clinical:  { fill: "#0D9488", light: "#99F6E4" },
  reference: { fill: "#059669", light: "#A7F3D0" },
  ml:        { fill: "#7C3AED", light: "#DDD6FE" },
};

const ERD_ENTITIES: ErdEntity[] = [
  { id: "users", x: 10, y: 10, w: 170, domain: "auth", fields: [
    { name: "id", type: "UUID", constraint: "PK" },
    { name: "username", type: "VARCHAR(50)", constraint: "UK" },
    { name: "email", type: "VARCHAR(100)", constraint: "UK" },
    { name: "password_hash", type: "VARCHAR(255)" },
    { name: "role", type: "VARCHAR(20)" },
    { name: "is_active", type: "BOOLEAN" },
  ]},
  { id: "patients", x: 215, y: 10, w: 170, domain: "clinical", fields: [
    { name: "id", type: "UUID", constraint: "PK" },
    { name: "patient_code", type: "VARCHAR(20)", constraint: "UK" },
    { name: "full_name", type: "VARCHAR(100)" },
    { name: "date_of_birth", type: "DATE" },
    { name: "gender", type: "VARCHAR(10)" },
    { name: "created_by", type: "UUID", constraint: "FK" },
  ]},
  { id: "medical_records", x: 420, y: 10, w: 185, domain: "clinical", fields: [
    { name: "id", type: "UUID", constraint: "PK" },
    { name: "record_code", type: "VARCHAR(30)", constraint: "UK" },
    { name: "patient_id", type: "UUID", constraint: "FK" },
    { name: "created_by", type: "UUID", constraint: "FK" },
    { name: "chief_complaint", type: "TEXT" },
    { name: "vital_signs", type: "JSONB" },
    { name: "severity", type: "VARCHAR(20)" },
    { name: "status", type: "VARCHAR(20)" },
  ]},
  { id: "symptoms", x: 215, y: 235, w: 170, domain: "reference", fields: [
    { name: "id", type: "UUID", constraint: "PK" },
    { name: "name", type: "VARCHAR(100)", constraint: "UK" },
    { name: "category", type: "VARCHAR(50)" },
  ]},
  { id: "record_symptoms", x: 420, y: 255, w: 185, domain: "clinical", fields: [
    { name: "(record_id, symptom_id)", type: "COMP", constraint: "PK" },
    { name: "record_id", type: "UUID", constraint: "FK" },
    { name: "symptom_id", type: "UUID", constraint: "FK" },
    { name: "severity", type: "VARCHAR(20)" },
  ]},
  { id: "drug_groups", x: 645, y: 10, w: 175, domain: "reference", fields: [
    { name: "id", type: "UUID", constraint: "PK" },
    { name: "name", type: "VARCHAR(100)", constraint: "UK" },
    { name: "code", type: "VARCHAR(20)", constraint: "UK" },
    { name: "category", type: "VARCHAR(100)" },
    { name: "common_drugs", type: "TEXT[]" },
  ]},
  { id: "predictions", x: 645, y: 235, w: 185, domain: "ml", fields: [
    { name: "id", type: "UUID", constraint: "PK" },
    { name: "record_id", type: "UUID", constraint: "FK" },
    { name: "model_config_id", type: "UUID", constraint: "FK" },
    { name: "predicted_groups", type: "JSONB" },
    { name: "top1_group_id", type: "UUID", constraint: "FK" },
    { name: "top1_confidence", type: "DECIMAL(5,4)" },
    { name: "is_confirmed", type: "BOOLEAN" },
    { name: "confirmed_by", type: "UUID", constraint: "FK" },
  ]},
  { id: "model_configs", x: 865, y: 10, w: 185, domain: "ml", fields: [
    { name: "id", type: "UUID", constraint: "PK" },
    { name: "name", type: "VARCHAR(100)" },
    { name: "architecture", type: "VARCHAR(50)" },
    { name: "hyperparameters", type: "JSONB" },
    { name: "status", type: "VARCHAR(20)" },
    { name: "is_active", type: "BOOLEAN" },
  ]},
  { id: "model_metrics", x: 865, y: 205, w: 185, domain: "ml", fields: [
    { name: "id", type: "UUID", constraint: "PK" },
    { name: "model_config_id", type: "UUID", constraint: "FK" },
    { name: "dataset_split", type: "VARCHAR(20)" },
    { name: "accuracy", type: "DECIMAL(5,4)" },
    { name: "f1_macro", type: "DECIMAL(5,4)" },
  ]},
];

function ErdBox({ e }: { e: ErdEntity }) {
  const h = entityH(e);
  const { fill, light } = DOMAIN_COLORS[e.domain];
  return (
    <g>
      <rect x={e.x} y={e.y} width={e.w} height={h} rx={7} fill="white" stroke={light} strokeWidth={1.5} />
      <rect x={e.x} y={e.y} width={e.w} height={HDR_H} rx={7} fill={fill} />
      <rect x={e.x} y={e.y + HDR_H - 7} width={e.w} height={7} fill={fill} />
      <text x={e.x + 10} y={e.y + 19} fill="white" fontSize={11} fontWeight="bold" fontFamily="ui-monospace,monospace">{e.id}</text>
      <text x={e.x + e.w - 8} y={e.y + 18} fill="rgba(255,255,255,0.55)" fontSize={9} textAnchor="end">{e.fields.length} cols</text>
      {e.fields.map((f, i) => {
        const fy = e.y + HDR_H + i * ROW_H;
        const hasBadge = !!f.constraint;
        const bFill = f.constraint === "PK" ? "#d97706" : f.constraint === "FK" ? "#2563eb" : "#7c3aed";
        return (
          <g key={f.name}>
            {f.constraint === "PK" && <rect x={e.x} y={fy} width={e.w} height={ROW_H} fill="#fffbeb" />}
            {i > 0 && <line x1={e.x + 1} y1={fy} x2={e.x + e.w - 1} y2={fy} stroke="#f3f4f6" strokeWidth={0.5} />}
            {hasBadge && <rect x={e.x + 5} y={fy + 3} width={16} height={11} rx={2} fill={bFill} />}
            {hasBadge && <text x={e.x + 13} y={fy + 12} fill="white" fontSize={7} fontWeight="bold" textAnchor="middle">{f.constraint}</text>}
            <text x={e.x + (hasBadge ? 25 : 8)} y={fy + 12} fill="#374151" fontSize={9.5} fontFamily="ui-monospace,monospace">{f.name}</text>
            <text x={e.x + e.w - 6} y={fy + 12} fill="#9ca3af" fontSize={8.5} textAnchor="end" fontFamily="ui-monospace,monospace">{f.type.split("(")[0]}</text>
          </g>
        );
      })}
    </g>
  );
}

// Pre-computed relationship paths
const ERD_ARROWS = [
  { d: "M 180,78 L 215,78",               label: "1:N", lx: 197, ly: 73, stroke: "#0891B2" },  // users→patients
  { d: "M 385,78 L 402,78 L 402,96 L 420,96",  label: "1:N", lx: 400, ly: 74, stroke: "#0D9488" },  // patients→medical_records
  { d: "M 512,192 L 512,255",             label: "1:N", lx: 518, ly: 225, stroke: "#0D9488" },  // medical_records→record_symptoms
  { d: "M 385,276 L 402,276 L 402,300 L 420,300", label: "N:N", lx: 390, ly: 272, stroke: "#059669" }, // symptoms→record_symptoms
  { d: "M 605,108 L 625,108 L 625,317 L 645,317", label: "1:N", lx: 620, ly: 216, stroke: "#7C3AED" }, // medical_records→predictions
  { d: "M 732,128 L 732,235",             label: "1:N", lx: 738, ly: 182, stroke: "#059669" },  // drug_groups→predictions
  { d: "M 865,78 L 845,78 L 845,317 L 830,317",   label: "1:N", lx: 840, ly: 200, stroke: "#7C3AED" }, // model_configs→predictions
  { d: "M 957,148 L 957,205",             label: "1:N", lx: 963, ly: 177, stroke: "#7C3AED" },  // model_configs→model_metrics
];

function ErdSvg() {
  return (
    <div className="overflow-x-auto rounded-xl border border-gray-100">
      <svg viewBox="0 0 1065 430" width="1065" height="430" xmlns="http://www.w3.org/2000/svg">
        <defs>
          {["#0891B2","#0D9488","#059669","#7C3AED"].map((c, i) => (
            <marker key={i} id={`arr-${i}`} markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
              <polygon points="0 0, 8 3, 0 6" fill={c} />
            </marker>
          ))}
        </defs>
        <rect width="1065" height="430" fill="#f8fafc" rx="12" />

        {/* Domain labels */}
        <text x="15" y="8" fill="#0891B2" fontSize="9" fontWeight="bold" fontFamily="sans-serif">AUTH</text>
        <text x="220" y="8" fill="#0D9488" fontSize="9" fontWeight="bold" fontFamily="sans-serif">CLINICAL</text>
        <text x="650" y="8" fill="#059669" fontSize="9" fontWeight="bold" fontFamily="sans-serif">REFERENCE</text>
        <text x="870" y="8" fill="#7C3AED" fontSize="9" fontWeight="bold" fontFamily="sans-serif">AI / ML</text>

        {/* Relationship arrows */}
        {ERD_ARROWS.map((a, i) => {
          const colorIdx = ["#0891B2","#0D9488","#059669","#7C3AED"].indexOf(a.stroke);
          return (
            <g key={i}>
              <path d={a.d} fill="none" stroke={a.stroke} strokeWidth={1.5} strokeDasharray="4 2"
                markerEnd={`url(#arr-${colorIdx < 0 ? 0 : colorIdx})`} opacity={0.7} />
              <text x={a.lx} y={a.ly} fill={a.stroke} fontSize={8} fontWeight="bold" fontFamily="sans-serif">{a.label}</text>
            </g>
          );
        })}

        {/* Entity boxes */}
        {ERD_ENTITIES.map(e => <ErdBox key={e.id} e={e} />)}
      </svg>
    </div>
  );
}

// ── Data Dictionary ───────────────────────────────────────────────────────
interface DictColumn { col: string; type: string; nullable: boolean; default_val?: string; description: string; }
interface DictTable  { name: string; description: string; domain: string; columns: DictColumn[]; }

const DICT_TABLES: DictTable[] = [
  {
    name: "users", description: "Người dùng hệ thống: bác sĩ, y tá, nghiên cứu viên, admin", domain: "auth",
    columns: [
      { col: "id",            type: "UUID",         nullable: false, default_val: "gen_random_uuid()", description: "Khóa chính tự sinh" },
      { col: "username",      type: "VARCHAR(50)",  nullable: false, description: "Tên đăng nhập duy nhất" },
      { col: "email",         type: "VARCHAR(100)", nullable: false, description: "Email duy nhất" },
      { col: "password_hash", type: "VARCHAR(255)", nullable: false, description: "Mật khẩu đã hash (bcrypt)" },
      { col: "full_name",     type: "VARCHAR(100)", nullable: false, description: "Họ và tên đầy đủ" },
      { col: "role",          type: "VARCHAR(20)",  nullable: false, default_val: "doctor", description: "Vai trò: admin | doctor | nurse | researcher" },
      { col: "is_active",     type: "BOOLEAN",      nullable: false, default_val: "TRUE", description: "Trạng thái tài khoản" },
      { col: "created_at",    type: "TIMESTAMP",    nullable: true,  default_val: "NOW()", description: "Thời điểm tạo" },
      { col: "updated_at",    type: "TIMESTAMP",    nullable: true,  default_val: "NOW()", description: "Thời điểm cập nhật gần nhất" },
    ]
  },
  {
    name: "patients", description: "Hồ sơ bệnh nhân — không phải tài khoản đăng nhập", domain: "clinical",
    columns: [
      { col: "id",              type: "UUID",         nullable: false, default_val: "gen_random_uuid()", description: "Khóa chính" },
      { col: "patient_code",    type: "VARCHAR(20)",  nullable: false, description: "Mã bệnh nhân (BN-00001), unique" },
      { col: "full_name",       type: "VARCHAR(100)", nullable: false, description: "Họ và tên" },
      { col: "date_of_birth",   type: "DATE",         nullable: false, description: "Ngày sinh" },
      { col: "gender",          type: "VARCHAR(10)",  nullable: false, description: "Giới tính: male | female | other" },
      { col: "phone",           type: "VARCHAR(15)",  nullable: true,  description: "Số điện thoại" },
      { col: "address",         type: "TEXT",         nullable: true,  description: "Địa chỉ" },
      { col: "blood_type",      type: "VARCHAR(5)",   nullable: true,  description: "Nhóm máu (A+, B-, O+...)" },
      { col: "allergies",       type: "TEXT[]",       nullable: true,  description: "Danh sách dị ứng" },
      { col: "chronic_diseases",type: "TEXT[]",       nullable: true,  description: "Bệnh mãn tính" },
      { col: "created_by",      type: "UUID",         nullable: true,  description: "FK → users.id (bác sĩ tạo)" },
    ]
  },
  {
    name: "symptoms", description: "Danh mục triệu chứng chuẩn hóa (reference table)", domain: "reference",
    columns: [
      { col: "id",          type: "UUID",         nullable: false, default_val: "gen_random_uuid()", description: "Khóa chính" },
      { col: "name",        type: "VARCHAR(100)", nullable: false, description: "Tên triệu chứng (unique): sốt cao, ho khan..." },
      { col: "category",    type: "VARCHAR(50)",  nullable: false, description: "Nhóm triệu chứng: toàn thân, hô hấp..." },
      { col: "description", type: "TEXT",         nullable: true,  description: "Mô tả chi tiết" },
      { col: "created_at",  type: "TIMESTAMP",    nullable: true,  default_val: "NOW()", description: "Thời điểm tạo" },
    ]
  },
  {
    name: "medical_records", description: "Bệnh án — trung tâm luồng dự đoán AI", domain: "clinical",
    columns: [
      { col: "id",               type: "UUID",         nullable: false, default_val: "gen_random_uuid()", description: "Khóa chính" },
      { col: "record_code",      type: "VARCHAR(30)",  nullable: false, description: "Mã bệnh án (BA-2026-00001), unique" },
      { col: "patient_id",       type: "UUID",         nullable: false, description: "FK → patients.id (CASCADE DELETE)" },
      { col: "created_by",       type: "UUID",         nullable: false, description: "FK → users.id (bác sĩ tạo bệnh án)" },
      { col: "chief_complaint",  type: "TEXT",         nullable: false, description: "Triệu chứng chính (input chính cho AI)" },
      { col: "description",      type: "TEXT",         nullable: true,  description: "Mô tả chi tiết bệnh án" },
      { col: "symptoms_duration",type: "VARCHAR(50)",  nullable: true,  description: "Thời gian triệu chứng: 3 ngày, 1 tuần..." },
      { col: "vital_signs",      type: "JSONB",        nullable: true,  description: "Sinh hiệu: nhiệt độ, HA, nhịp tim, SpO2..." },
      { col: "diagnosis",        type: "VARCHAR(200)", nullable: true,  description: "Chẩn đoán sơ bộ" },
      { col: "diagnosis_icd",    type: "VARCHAR(10)",  nullable: true,  description: "Mã ICD-10" },
      { col: "severity",         type: "VARCHAR(20)",  nullable: false, default_val: "mild", description: "Mức độ: mild | moderate | severe | critical" },
      { col: "status",           type: "VARCHAR(20)",  nullable: false, default_val: "pending", description: "Trạng thái: pending | predicted | confirmed | archived" },
    ]
  },
  {
    name: "record_symptoms", description: "Bảng junction N:N giữa bệnh án và triệu chứng", domain: "clinical",
    columns: [
      { col: "record_id",  type: "UUID",        nullable: false, description: "FK → medical_records.id (PK thành phần)" },
      { col: "symptom_id", type: "UUID",        nullable: false, description: "FK → symptoms.id (PK thành phần)" },
      { col: "severity",   type: "VARCHAR(20)", nullable: true,  default_val: "moderate", description: "Mức độ triệu chứng trong bệnh án này" },
      { col: "notes",      type: "TEXT",        nullable: true,  description: "Ghi chú thêm" },
    ]
  },
  {
    name: "drug_groups", description: "Danh mục nhóm thuốc — nhãn phân loại của mô hình AI", domain: "reference",
    columns: [
      { col: "id",               type: "UUID",         nullable: false, default_val: "gen_random_uuid()", description: "Khóa chính" },
      { col: "name",             type: "VARCHAR(100)", nullable: false, description: "Tên nhóm thuốc (unique)" },
      { col: "code",             type: "VARCHAR(20)",  nullable: false, description: "Mã ATC (unique): ATC-J01CA04" },
      { col: "category",         type: "VARCHAR(100)", nullable: false, description: "Phân loại: Kháng sinh, Giảm đau..." },
      { col: "description",      type: "TEXT",         nullable: true,  description: "Mô tả nhóm thuốc" },
      { col: "common_drugs",     type: "TEXT[]",       nullable: true,  description: "Thuốc phổ biến trong nhóm" },
      { col: "contraindications",type: "TEXT[]",       nullable: true,  description: "Chống chỉ định" },
      { col: "side_effects",     type: "TEXT[]",       nullable: true,  description: "Tác dụng phụ thường gặp" },
      { col: "is_active",        type: "BOOLEAN",      nullable: false, default_val: "TRUE", description: "Nhóm thuốc còn dùng trong hệ thống" },
    ]
  },
  {
    name: "model_configs", description: "Cấu hình và siêu tham số mô hình ML (XLM-RoBERTa + LoRA)", domain: "ml",
    columns: [
      { col: "id",               type: "UUID",         nullable: false, default_val: "gen_random_uuid()", description: "Khóa chính" },
      { col: "name",             type: "VARCHAR(100)", nullable: false, description: "Tên mô hình" },
      { col: "version",          type: "VARCHAR(20)",  nullable: false, description: "Phiên bản: 1.0.0" },
      { col: "architecture",     type: "VARCHAR(50)",  nullable: false, description: "Kiến trúc: mamba | transformer | lstm" },
      { col: "optimizer",        type: "VARCHAR(50)",  nullable: false, description: "Optimizer: adamw | lion | soap" },
      { col: "hyperparameters",  type: "JSONB",        nullable: false, description: "Siêu tham số: lr, batch_size, epochs, dropout..." },
      { col: "model_path",       type: "VARCHAR(255)", nullable: true,  description: "Đường dẫn file weights (.safetensors)" },
      { col: "status",           type: "VARCHAR(20)",  nullable: false, default_val: "draft", description: "Trạng thái: draft | training | ready | deprecated" },
      { col: "is_active",        type: "BOOLEAN",      nullable: false, default_val: "FALSE", description: "Chỉ 1 model active tại 1 thời điểm (partial unique index)" },
      { col: "trained_by",       type: "UUID",         nullable: true,  description: "FK → users.id" },
    ]
  },
  {
    name: "predictions", description: "Kết quả dự đoán nhóm thuốc từ mô hình AI", domain: "ml",
    columns: [
      { col: "id",                 type: "UUID",           nullable: false, default_val: "gen_random_uuid()", description: "Khóa chính" },
      { col: "record_id",          type: "UUID",           nullable: false, description: "FK → medical_records.id" },
      { col: "model_config_id",    type: "UUID",           nullable: false, description: "FK → model_configs.id (model đã dùng)" },
      { col: "predicted_groups",   type: "JSONB",          nullable: false, description: "Top-N dự đoán: [{drug_group_id, confidence, rank}...]" },
      { col: "top1_group_id",      type: "UUID",           nullable: true,  description: "FK → drug_groups.id (kết quả #1)" },
      { col: "top1_confidence",    type: "DECIMAL(5,4)",   nullable: true,  description: "Confidence score kết quả #1 (0.0–1.0)" },
      { col: "processing_time_ms", type: "INTEGER",        nullable: true,  description: "Thời gian inference (ms)" },
      { col: "is_confirmed",       type: "BOOLEAN",        nullable: false, default_val: "FALSE", description: "Bác sĩ đã xác nhận kết quả" },
      { col: "confirmed_group_id", type: "UUID",           nullable: true,  description: "FK → drug_groups.id (nhóm thuốc bác sĩ chọn)" },
      { col: "confirmed_by",       type: "UUID",           nullable: true,  description: "FK → users.id (bác sĩ xác nhận)" },
      { col: "feedback_rating",    type: "SMALLINT",       nullable: true,  description: "Đánh giá bác sĩ: 1–5 sao" },
    ]
  },
  {
    name: "model_metrics", description: "Kết quả đánh giá mô hình trên từng tập dữ liệu", domain: "ml",
    columns: [
      { col: "id",               type: "UUID",          nullable: false, default_val: "gen_random_uuid()", description: "Khóa chính" },
      { col: "model_config_id",  type: "UUID",          nullable: false, description: "FK → model_configs.id" },
      { col: "dataset_split",    type: "VARCHAR(20)",   nullable: false, description: "Tập dữ liệu: train | validation | test" },
      { col: "accuracy",         type: "DECIMAL(5,4)",  nullable: true,  description: "Độ chính xác tổng thể" },
      { col: "precision_macro",  type: "DECIMAL(5,4)",  nullable: true,  description: "Precision macro-averaged" },
      { col: "recall_macro",     type: "DECIMAL(5,4)",  nullable: true,  description: "Recall macro-averaged" },
      { col: "f1_macro",         type: "DECIMAL(5,4)",  nullable: true,  description: "F1-score macro-averaged" },
      { col: "confusion_matrix", type: "JSONB",         nullable: true,  description: "Ma trận nhầm lẫn dạng JSONB" },
      { col: "per_class_metrics",type: "JSONB",         nullable: true,  description: "Metrics từng nhóm thuốc: {precision, recall, f1}" },
    ]
  },
];

// ── SQL Script ────────────────────────────────────────────────────────────
const SCHEMA_SQL = `-- ============================================================
-- pj-medicine — Database Schema (PostgreSQL 16)
-- Hệ thống dự đoán nhóm thuốc từ mô tả bệnh án ngắn
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. USERS
CREATE TABLE users (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username      VARCHAR(50)  UNIQUE NOT NULL,
    email         VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name     VARCHAR(100) NOT NULL,
    role          VARCHAR(20)  NOT NULL DEFAULT 'doctor'
                  CHECK (role IN ('admin','doctor','nurse','researcher')),
    is_active     BOOLEAN  DEFAULT TRUE,
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_users_role   ON users(role);
CREATE INDEX idx_users_email  ON users(email);
CREATE INDEX idx_users_active ON users(is_active) WHERE is_active = TRUE;

-- 2. PATIENTS
CREATE TABLE patients (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_code     VARCHAR(20)  UNIQUE NOT NULL,
    full_name        VARCHAR(100) NOT NULL,
    date_of_birth    DATE         NOT NULL,
    gender           VARCHAR(10)  NOT NULL CHECK (gender IN ('male','female','other')),
    phone            VARCHAR(15),
    address          TEXT,
    blood_type       VARCHAR(5)   CHECK (blood_type IN ('A+','A-','B+','B-','AB+','AB-','O+','O-')),
    allergies        TEXT[],
    chronic_diseases TEXT[],
    created_by       UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_patients_code       ON patients(patient_code);
CREATE INDEX idx_patients_name       ON patients(full_name);
CREATE INDEX idx_patients_created_by ON patients(created_by);

-- 3. SYMPTOMS
CREATE TABLE symptoms (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR(100) UNIQUE NOT NULL,
    category    VARCHAR(50)  NOT NULL,
    description TEXT,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_symptoms_category ON symptoms(category);

-- 4. MEDICAL_RECORDS
CREATE TABLE medical_records (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    record_code       VARCHAR(30) UNIQUE NOT NULL,
    patient_id        UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    created_by        UUID NOT NULL REFERENCES users(id),
    chief_complaint   TEXT NOT NULL,
    description       TEXT,
    symptoms_duration VARCHAR(50),
    vital_signs       JSONB,
    diagnosis         VARCHAR(200),
    diagnosis_icd     VARCHAR(10),
    severity          VARCHAR(20) DEFAULT 'mild'
                      CHECK (severity IN ('mild','moderate','severe','critical')),
    status            VARCHAR(20) DEFAULT 'pending'
                      CHECK (status IN ('pending','predicted','confirmed','archived')),
    created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_records_patient ON medical_records(patient_id);
CREATE INDEX idx_records_creator ON medical_records(created_by);
CREATE INDEX idx_records_status  ON medical_records(status);
CREATE INDEX idx_records_created ON medical_records(created_at DESC);

-- 5. RECORD_SYMPTOMS (junction N:N)
CREATE TABLE record_symptoms (
    record_id  UUID NOT NULL REFERENCES medical_records(id) ON DELETE CASCADE,
    symptom_id UUID NOT NULL REFERENCES symptoms(id)        ON DELETE CASCADE,
    severity   VARCHAR(20) DEFAULT 'moderate'
               CHECK (severity IN ('mild','moderate','severe')),
    notes      TEXT,
    PRIMARY KEY (record_id, symptom_id)
);
CREATE INDEX idx_record_symptoms_symptom ON record_symptoms(symptom_id);

-- 6. DRUG_GROUPS
CREATE TABLE drug_groups (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name              VARCHAR(100) UNIQUE NOT NULL,
    code              VARCHAR(20)  UNIQUE NOT NULL,
    category          VARCHAR(100) NOT NULL,
    description       TEXT,
    common_drugs      TEXT[],
    contraindications TEXT[],
    side_effects      TEXT[],
    is_active         BOOLEAN   DEFAULT TRUE,
    created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_drug_groups_category ON drug_groups(category);
CREATE INDEX idx_drug_groups_code     ON drug_groups(code);

-- 7. MODEL_CONFIGS
CREATE TABLE model_configs (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name             VARCHAR(100) NOT NULL,
    version          VARCHAR(20)  NOT NULL,
    architecture     VARCHAR(50)  NOT NULL,
    optimizer        VARCHAR(50)  NOT NULL,
    hyperparameters  JSONB        NOT NULL,
    model_path       VARCHAR(255),
    training_dataset VARCHAR(255),
    status           VARCHAR(20) DEFAULT 'draft'
                     CHECK (status IN ('draft','training','ready','deprecated')),
    is_active        BOOLEAN DEFAULT FALSE,
    trained_by       UUID REFERENCES users(id),
    created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_model_name_version UNIQUE (name, version)
);
CREATE UNIQUE INDEX idx_model_configs_active
    ON model_configs(is_active) WHERE is_active = TRUE;

-- 8. PREDICTIONS
CREATE TABLE predictions (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    record_id          UUID NOT NULL REFERENCES medical_records(id) ON DELETE CASCADE,
    model_config_id    UUID NOT NULL REFERENCES model_configs(id),
    predicted_groups   JSONB NOT NULL,
    top1_group_id      UUID REFERENCES drug_groups(id),
    top1_confidence    DECIMAL(5,4),
    processing_time_ms INTEGER,
    is_confirmed       BOOLEAN DEFAULT FALSE,
    confirmed_group_id UUID REFERENCES drug_groups(id),
    confirmed_by       UUID REFERENCES users(id),
    confirmed_at       TIMESTAMP,
    doctor_feedback    TEXT,
    feedback_rating    SMALLINT CHECK (feedback_rating BETWEEN 1 AND 5),
    created_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_predictions_record    ON predictions(record_id);
CREATE INDEX idx_predictions_model     ON predictions(model_config_id);
CREATE INDEX idx_predictions_confirmed ON predictions(is_confirmed);
CREATE INDEX idx_predictions_created   ON predictions(created_at DESC);

-- 9. MODEL_METRICS
CREATE TABLE model_metrics (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    model_config_id   UUID NOT NULL REFERENCES model_configs(id) ON DELETE CASCADE,
    dataset_split     VARCHAR(20) NOT NULL
                      CHECK (dataset_split IN ('train','validation','test')),
    accuracy          DECIMAL(5,4),
    precision_macro   DECIMAL(5,4),
    recall_macro      DECIMAL(5,4),
    f1_macro          DECIMAL(5,4),
    confusion_matrix  JSONB,
    per_class_metrics JSONB,
    evaluated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_metrics_model ON model_metrics(model_config_id);

-- TRIGGER: auto-update updated_at
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = CURRENT_TIMESTAMP; RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated    BEFORE UPDATE ON users          FOR EACH ROW EXECUTE FUNCTION update_timestamp();
CREATE TRIGGER trg_patients_updated BEFORE UPDATE ON patients        FOR EACH ROW EXECUTE FUNCTION update_timestamp();
CREATE TRIGGER trg_records_updated  BEFORE UPDATE ON medical_records FOR EACH ROW EXECUTE FUNCTION update_timestamp();
CREATE TRIGGER trg_model_updated    BEFORE UPDATE ON model_configs   FOR EACH ROW EXECUTE FUNCTION update_timestamp();`;

// ── User Story Mapping ────────────────────────────────────────────────────
const USER_STORIES = [
  { id: "US-01", role: "Doctor", story: "Đăng nhập vào hệ thống bằng tài khoản được cấp", tables: ["users"], ops: ["SELECT"] },
  { id: "US-02", role: "Doctor", story: "Tìm kiếm và xem thông tin chi tiết bệnh nhân", tables: ["patients"], ops: ["SELECT"] },
  { id: "US-03", role: "Doctor / Nurse", story: "Thêm hồ sơ bệnh nhân mới vào hệ thống", tables: ["patients"], ops: ["INSERT"] },
  { id: "US-04", role: "Doctor", story: "Tạo bệnh án và gắn triệu chứng cho bệnh nhân", tables: ["medical_records", "record_symptoms", "symptoms"], ops: ["INSERT", "SELECT"] },
  { id: "US-05", role: "Doctor", story: "Chạy mô hình AI dự đoán nhóm thuốc phù hợp", tables: ["predictions", "model_configs", "drug_groups"], ops: ["INSERT", "SELECT"] },
  { id: "US-06", role: "Doctor", story: "Xem kết quả dự đoán với confidence score", tables: ["predictions", "drug_groups"], ops: ["SELECT"] },
  { id: "US-07", role: "Doctor", story: "Xác nhận hoặc từ chối kết quả AI, cho điểm phản hồi", tables: ["predictions"], ops: ["UPDATE"] },
  { id: "US-08", role: "Doctor", story: "Xem lịch sử tất cả dự đoán đã thực hiện", tables: ["predictions", "medical_records", "patients"], ops: ["SELECT"] },
  { id: "US-09", role: "Nurse", story: "Cập nhật và bổ sung triệu chứng cho bệnh án", tables: ["record_symptoms", "symptoms"], ops: ["INSERT", "DELETE"] },
  { id: "US-10", role: "Admin", story: "Tạo, khoá, phân quyền tài khoản người dùng", tables: ["users"], ops: ["INSERT", "UPDATE", "DELETE"] },
  { id: "US-11", role: "Admin", story: "Cấu hình và kích hoạt mô hình AI mới", tables: ["model_configs"], ops: ["INSERT", "UPDATE"] },
  { id: "US-12", role: "Admin", story: "Xem tổng quan KPI hệ thống (dashboard)", tables: ["predictions", "patients", "medical_records", "users"], ops: ["SELECT (agg)"] },
  { id: "US-13", role: "Researcher", story: "Phân tích hiệu suất và so sánh các phiên bản mô hình", tables: ["model_metrics", "model_configs"], ops: ["SELECT (agg)"] },
  { id: "US-14", role: "Researcher", story: "Xem phân bố nhóm thuốc và xu hướng dự đoán", tables: ["predictions", "drug_groups", "medical_records"], ops: ["SELECT (agg)"] },
];

const ROLE_PILL: Record<string, string> = {
  "Doctor":          "bg-blue-50 text-[#0891B2] border border-blue-200",
  "Doctor / Nurse":  "bg-teal-50 text-teal-700 border border-teal-200",
  "Nurse":           "bg-emerald-50 text-emerald-700 border border-emerald-200",
  "Admin":           "bg-rose-50 text-rose-600 border border-rose-200",
  "Researcher":      "bg-amber-50 text-amber-700 border border-amber-200",
};

const OP_PILL: Record<string, string> = {
  "SELECT":     "bg-gray-100 text-gray-600",
  "SELECT (agg)": "bg-gray-100 text-gray-500",
  "INSERT":     "bg-green-50 text-green-700",
  "UPDATE":     "bg-amber-50 text-amber-700",
  "DELETE":     "bg-red-50 text-red-600",
};

const DOMAIN_BADGE: Record<string, string> = {
  auth:      "bg-blue-50 text-[#0891B2] border-blue-200",
  clinical:  "bg-teal-50 text-teal-700 border-teal-200",
  reference: "bg-emerald-50 text-emerald-700 border-emerald-200",
  ml:        "bg-violet-50 text-violet-700 border-violet-200",
};

// ── Main Component ────────────────────────────────────────────────────────
export default function DatabaseDesignSection() {
  const [activeTab, setActiveTab] = useState<DbTab>("erd");
  const [expandedTable, setExpandedTable] = useState<string | null>("users");
  const [copied, setCopied] = useState(false);

  const TABS: { id: DbTab; label: string; icon: React.ReactNode }[] = [
    { id: "erd",     label: "ERD",              icon: <Database  className="w-3.5 h-3.5" /> },
    { id: "dict",    label: "Từ điển dữ liệu",  icon: <BookOpen  className="w-3.5 h-3.5" /> },
    { id: "script",  label: "Script SQL",        icon: <Code2     className="w-3.5 h-3.5" /> },
    { id: "mapping", label: "User Story ↔ DB",   icon: <GitBranch className="w-3.5 h-3.5" /> },
  ];

  function copyScript() {
    navigator.clipboard.writeText(SCHEMA_SQL).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <section id="database" className="py-24 bg-gray-50/50 border-t border-gray-100">
      <div className="max-w-6xl mx-auto px-6">

        {/* Header */}
        <div className="flex flex-col items-center text-center mb-12">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 text-[#0891B2] text-[10px] font-bold mb-3 border border-blue-100/60 uppercase tracking-wider">
            Thiết kế cơ sở dữ liệu
          </div>
          <h2 className="text-3xl md:text-4xl font-bold font-heading mb-3">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#0891B2] to-[#22D3EE]">
              Database Design
            </span>
          </h2>
          <p className="text-[#164E63]/65 text-lg max-w-2xl">
            PostgreSQL 16 · 9 bảng · chuẩn 3NF · JSONB cho dữ liệu linh hoạt · tích hợp đầy đủ với mô hình AI
          </p>
          {/* Stats row */}
          <div className="flex flex-wrap justify-center gap-6 mt-6 text-sm">
            {[
              { label: "Bảng dữ liệu", value: "9" },
              { label: "Cột tổng cộng", value: "74" },
              { label: "Khóa ngoại (FK)", value: "14" },
              { label: "Chỉ mục (INDEX)", value: "21" },
            ].map(s => (
              <div key={s.label} className="flex flex-col items-center gap-0.5">
                <span className="text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-[#0891B2] to-[#22D3EE]">{s.value}</span>
                <span className="text-[#164E63]/50 text-xs font-medium">{s.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Tab bar */}
        <div className="flex gap-1 bg-white border border-gray-100 shadow-sm p-1 rounded-xl mb-8 w-fit mx-auto">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                activeTab === t.id
                  ? "bg-[#0891B2] text-white shadow-sm shadow-[#0891B2]/30"
                  : "text-[#164E63]/55 hover:text-[#164E63]/80 hover:bg-gray-50"
              }`}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>

        {/* ── ERD ── */}
        {activeTab === "erd" && (
          <div className="flex flex-col gap-6">
            <ErdSvg />
            {/* Legend */}
            <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm">
              <h3 className="text-sm font-bold text-[#164E63] mb-4">Quan hệ giữa các thực thể</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs mb-5">
                {[
                  { color: "#0891B2", label: "Auth", desc: "users" },
                  { color: "#0D9488", label: "Clinical", desc: "patients · medical_records · record_symptoms" },
                  { color: "#059669", label: "Reference", desc: "symptoms · drug_groups" },
                  { color: "#7C3AED", label: "AI / ML", desc: "model_configs · predictions · model_metrics" },
                ].map(d => (
                  <div key={d.label} className="flex items-start gap-2">
                    <div className="w-3 h-3 rounded-sm mt-0.5 shrink-0" style={{ background: d.color }} />
                    <div>
                      <div className="font-bold" style={{ color: d.color }}>{d.label}</div>
                      <div className="text-[#164E63]/50">{d.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-[#164E63]/70">
                {[
                  { from: "users", to: "patients", rel: "1:N", key: "created_by" },
                  { from: "patients", to: "medical_records", rel: "1:N", key: "patient_id" },
                  { from: "medical_records", to: "record_symptoms", rel: "1:N", key: "record_id" },
                  { from: "symptoms", to: "record_symptoms", rel: "N:N", key: "symptom_id (junction)" },
                  { from: "medical_records", to: "predictions", rel: "1:N", key: "record_id" },
                  { from: "drug_groups", to: "predictions", rel: "1:N", key: "top1_group_id" },
                  { from: "model_configs", to: "predictions", rel: "1:N", key: "model_config_id" },
                  { from: "model_configs", to: "model_metrics", rel: "1:N", key: "model_config_id" },
                ].map(r => (
                  <div key={r.from + r.to} className="flex items-center gap-2 py-1 border-b border-gray-50 last:border-0">
                    <code className="font-mono text-[#0891B2] text-[11px]">{r.from}</code>
                    <span className="text-gray-300">→</span>
                    <code className="font-mono text-[#0891B2] text-[11px]">{r.to}</code>
                    <span className="ml-auto font-bold text-[11px] text-[#164E63]/40">{r.rel}</span>
                    <span className="text-[#164E63]/35 font-mono text-[10px]">[{r.key}]</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── DATA DICTIONARY ── */}
        {activeTab === "dict" && (
          <div className="flex flex-col gap-3">
            {DICT_TABLES.map(table => {
              const isOpen = expandedTable === table.name;
              const badge = DOMAIN_BADGE[table.domain] ?? "bg-gray-100 text-gray-600 border-gray-200";
              return (
                <div key={table.name} className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">
                  <button
                    onClick={() => setExpandedTable(isOpen ? null : table.name)}
                    className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-gray-50/50 transition-colors"
                  >
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${badge}`}>
                      {table.domain.toUpperCase()}
                    </span>
                    <code className="font-mono font-bold text-[#164E63] text-sm">{table.name}</code>
                    <span className="text-[#164E63]/45 text-xs">{table.description}</span>
                    <span className="ml-auto text-[#164E63]/30 text-xs shrink-0">{table.columns.length} cols</span>
                    {isOpen
                      ? <ChevronDown  className="w-4 h-4 text-[#164E63]/35 shrink-0" />
                      : <ChevronRight className="w-4 h-4 text-[#164E63]/35 shrink-0" />}
                  </button>
                  {isOpen && (
                    <div className="border-t border-gray-50 overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="bg-gray-50/70 border-b border-gray-100">
                            <th className="text-left px-5 py-2 text-[#164E63]/45 font-bold uppercase tracking-wider text-[10px] w-44">Cột</th>
                            <th className="text-left px-4 py-2 text-[#164E63]/45 font-bold uppercase tracking-wider text-[10px] w-36">Kiểu dữ liệu</th>
                            <th className="text-left px-4 py-2 text-[#164E63]/45 font-bold uppercase tracking-wider text-[10px] w-20">Null</th>
                            <th className="text-left px-4 py-2 text-[#164E63]/45 font-bold uppercase tracking-wider text-[10px] w-32">Default</th>
                            <th className="text-left px-4 py-2 text-[#164E63]/45 font-bold uppercase tracking-wider text-[10px]">Mô tả</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {table.columns.map(col => (
                            <tr key={col.col} className="hover:bg-gray-50/40 transition-colors">
                              <td className="px-5 py-2.5 font-mono font-semibold text-[#164E63] text-[11px]">{col.col}</td>
                              <td className="px-4 py-2.5 font-mono text-[#0891B2] text-[11px]">{col.type}</td>
                              <td className="px-4 py-2.5">
                                <span className={`text-[10px] font-bold ${col.nullable ? "text-gray-400" : "text-rose-500"}`}>
                                  {col.nullable ? "YES" : "NO"}
                                </span>
                              </td>
                              <td className="px-4 py-2.5 font-mono text-[#164E63]/40 text-[10px]">{col.default_val ?? "—"}</td>
                              <td className="px-4 py-2.5 text-[#164E63]/65">{col.description}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ── SQL SCRIPT ── */}
        {activeTab === "script" && (
          <div className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 bg-gray-50/50">
              <div className="flex items-center gap-3">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-400" />
                  <div className="w-3 h-3 rounded-full bg-amber-400" />
                  <div className="w-3 h-3 rounded-full bg-emerald-400" />
                </div>
                <code className="text-xs font-mono text-[#164E63]/50">schema.sql</code>
                <span className="text-[10px] text-[#164E63]/35 border border-gray-200 rounded px-1.5 py-0.5">PostgreSQL 16</span>
              </div>
              <button
                onClick={copyScript}
                className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all ${
                  copied
                    ? "bg-emerald-50 text-emerald-600 border border-emerald-200"
                    : "bg-gray-100 text-[#164E63]/60 hover:bg-[#0891B2]/10 hover:text-[#0891B2] border border-transparent"
                }`}
              >
                {copied ? <><Check className="w-3.5 h-3.5" /> Đã sao chép!</> : <><Copy className="w-3.5 h-3.5" /> Sao chép</>}
              </button>
            </div>
            <div className="overflow-auto max-h-[520px]">
              <pre className="px-6 py-5 text-[12px] leading-relaxed font-mono text-[#164E63]/80 whitespace-pre select-all">
                {SCHEMA_SQL}
              </pre>
            </div>
          </div>
        )}

        {/* ── USER STORY MAPPING ── */}
        {activeTab === "mapping" && (
          <div className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/30">
              <h3 className="text-sm font-bold text-[#164E63]">Mapping giữa User Story và Database Design</h3>
              <p className="text-xs text-[#164E63]/50 mt-0.5">Truy vết từng yêu cầu nghiệp vụ đến bảng dữ liệu tương ứng</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50">
                    <th className="text-left px-4 py-3 text-[#164E63]/45 font-bold uppercase tracking-wider text-[10px] w-16">#</th>
                    <th className="text-left px-4 py-3 text-[#164E63]/45 font-bold uppercase tracking-wider text-[10px] w-28">Vai trò</th>
                    <th className="text-left px-4 py-3 text-[#164E63]/45 font-bold uppercase tracking-wider text-[10px]">User Story</th>
                    <th className="text-left px-4 py-3 text-[#164E63]/45 font-bold uppercase tracking-wider text-[10px] w-72">Bảng liên quan</th>
                    <th className="text-left px-4 py-3 text-[#164E63]/45 font-bold uppercase tracking-wider text-[10px] w-48">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {USER_STORIES.map(s => (
                    <tr key={s.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-4 py-3">
                        <span className="font-mono text-[11px] font-bold text-[#164E63]/40">{s.id}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${ROLE_PILL[s.role] ?? "bg-gray-100 text-gray-600"}`}>
                          {s.role}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[#164E63]/75 leading-relaxed">{s.story}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {s.tables.map(t => (
                            <code key={t} className="text-[10px] bg-blue-50 text-[#0891B2] px-1.5 py-0.5 rounded border border-blue-100 font-mono font-semibold">{t}</code>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {s.ops.map(op => (
                            <span key={op} className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${OP_PILL[op] ?? "bg-gray-100 text-gray-600"}`}>{op}</span>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
    </section>
  );
}
