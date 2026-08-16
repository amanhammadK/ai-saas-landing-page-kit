import { NextResponse } from "next/server";

const experiments = new Map();

function generateVariant(base, id, changes) {
  const v = { ...base, id };
  for (const [k, val] of Object.entries(changes)) v[k] = val;
  return v;
}

export async function POST(request) {
  const { experimentName, basePage, variants } = await request.json();
  if (!experimentName || !basePage) {
    return NextResponse.json({ error: "experimentName and basePage required" }, { status: 400 });
  }
  const id = `exp_${Date.now()}`;
  const variantMap = { control: { ...basePage, traffic: 0.34 } };
  if (variants && Array.isArray(variants)) {
    const trafficEach = 0.66 / variants.length;
    variants.forEach((v, i) => {
      variantMap[`variant_${String.fromCharCode(65 + i)}`] = {
        ...generateVariant(basePage, String.fromCharCode(65 + i), v.changes || {}),
        traffic: trafficEach,
        hypothesis: v.hypothesis || "",
      };
    });
  }
  const experiment = {
    id,
    name: experimentName,
    status: "running",
    variants: variantMap,
    createdAt: new Date().toISOString(),
    metrics: { impressions: 0, conversions: 0, conversionRate: 0 },
  };
  experiments.set(id, experiment);
  return NextResponse.json(experiment);
}

export async function GET() {
  return NextResponse.json({ experiments: Array.from(experiments.values()), count: experiments.size });
}
