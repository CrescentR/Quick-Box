import { ToolShell } from '../../core/tool/ToolShell'
import { useMemo, useState } from 'react'
import { CodeBlock } from '../../ui'

type UnitCategory = 'length' | 'weight' | 'data' | 'temperature'

const unitDefinitions = {
  length: {
    label: '长度',
    base: 'm',
    units: {
      mm: 0.001,
      cm: 0.01,
      m: 1,
      km: 1000,
      in: 0.0254,
      ft: 0.3048,
      yd: 0.9144,
      mi: 1609.344,
    },
  },
  weight: {
    label: '重量',
    base: 'g',
    units: {
      mg: 0.001,
      g: 1,
      kg: 1000,
      oz: 28.349523125,
      lb: 453.59237,
    },
  },
  data: {
    label: '数据容量',
    base: 'B',
    units: {
      B: 1,
      KB: 1000,
      MB: 1000 ** 2,
      GB: 1000 ** 3,
      KiB: 1024,
      MiB: 1024 ** 2,
      GiB: 1024 ** 3,
    },
  },
}

function convertLinearUnit(category: Exclude<UnitCategory, 'temperature'>, value: number, fromUnit: string) {
  const definition = unitDefinitions[category]
  const factor = definition.units[fromUnit as keyof typeof definition.units]
  if (!factor || !Number.isFinite(value)) return null
  const baseValue = value * factor

  return Object.fromEntries(
    Object.entries(definition.units).map(([unit, unitFactor]) => [unit, Number((baseValue / unitFactor).toPrecision(12))]),
  )
}

function convertTemperature(value: number, fromUnit: string) {
  if (!Number.isFinite(value)) return null

  const celsius = fromUnit === 'F' ? (value - 32) * (5 / 9) : fromUnit === 'K' ? value - 273.15 : value

  return {
    C: Number(celsius.toPrecision(12)),
    F: Number(((celsius * 9) / 5 + 32).toPrecision(12)),
    K: Number((celsius + 273.15).toPrecision(12)),
  }
}

function getUnitOptions(category: UnitCategory) {
  if (category === 'temperature') return ['C', 'F', 'K']
  return Object.keys(unitDefinitions[category].units)
}

function convertUnits(category: UnitCategory, value: number, fromUnit: string) {
  const values = category === 'temperature' ? convertTemperature(value, fromUnit) : convertLinearUnit(category, value, fromUnit)
  if (!values) {
    return JSON.stringify(
      {
        valid: false,
        message: '数值或单位无效',
      },
      null,
      2,
    )
  }

  return JSON.stringify(
    {
      valid: true,
      category,
      input: {
        value,
        unit: fromUnit,
      },
      values,
    },
    null,
    2,
  )
}

export default function UnitConverterToolView() {
  const [category, setCategory] = useState<UnitCategory>('length')
  const [value, setValue] = useState(1000)
  const [fromUnit, setFromUnit] = useState('m')
  const unitOptions = useMemo(() => getUnitOptions(category), [category])
  const output = useMemo(() => convertUnits(category, value, fromUnit), [category, fromUnit, value])

  const updateCategory = (nextCategory: UnitCategory) => {
    setCategory(nextCategory)
    setFromUnit(getUnitOptions(nextCategory)[0])
  }

  return (
    <ToolShell title="单位换算器" level="L1" description="换算常见长度、重量、数据容量和温度单位，输出结构化结果。">
      <div className="qb-tool-grid">
        <label className="qb-tool-field">
          <span className="qb-tool-label">类别</span>
          <select className="qb-tool-input" value={category} onChange={(event) => updateCategory(event.target.value as UnitCategory)}>
            <option value="length">长度</option>
            <option value="weight">重量</option>
            <option value="data">数据容量</option>
            <option value="temperature">温度</option>
          </select>
        </label>
        <label className="qb-tool-field">
          <span className="qb-tool-label">输入单位</span>
          <select className="qb-tool-input" value={fromUnit} onChange={(event) => setFromUnit(event.target.value)}>
            {unitOptions.map((unit) => (
              <option value={unit} key={unit}>
                {unit}
              </option>
            ))}
          </select>
        </label>
        <label className="qb-tool-field qb-tool-field--full">
          <span className="qb-tool-label">数值</span>
          <input className="qb-tool-input qb-mono" type="number" value={value} onChange={(event) => setValue(Number(event.target.value))} />
        </label>
        <div className="qb-tool-field qb-tool-field--full">
          <span className="qb-tool-label">换算结果</span>
          <CodeBlock code={output} language="json" wrap copyable />
        </div>
      </div>
    </ToolShell>
  )
}
