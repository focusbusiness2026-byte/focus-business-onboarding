import ts from "typescript";
import {readFile} from "node:fs/promises";

export async function auditOnboardingFields() {
  const text=await readFile(new URL("../app/page.tsx",import.meta.url),"utf8");
  const source=ts.createSourceFile("page.tsx",text,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
  const bindings=new Map();
  function collect(node){if(ts.isVariableDeclaration(node)&&ts.isIdentifier(node.name)&&node.initializer)bindings.set(node.name.text,node.initializer);ts.forEachChild(node,collect);}collect(source);
  function literal(node,depth=0){
    if(!node||depth>8)return undefined;
    if(ts.isStringLiteral(node)||ts.isNumericLiteral(node))return node.text;
    if(ts.isArrayLiteralExpression(node))return node.elements.map(item=>literal(item,depth+1)).filter(item=>item!==undefined);
    if(ts.isIdentifier(node))return literal(bindings.get(node.text),depth+1);
    if(ts.isObjectLiteralExpression(node))return Object.fromEntries(node.properties.filter(ts.isPropertyAssignment).map(p=>[p.name.getText(source).replace(/["']/g,""),literal(p.initializer,depth+1)]));
    if(ts.isPropertyAccessExpression(node))return literal(node.expression,depth+1)?.[node.name.text];
    return undefined;
  }
  const result=[];
  function visit(node){
    if(ts.isJsxSelfClosingElement(node)||ts.isJsxOpeningElement(node)){
      const attrs={};for(const attr of node.attributes.properties)if(ts.isJsxAttribute(attr)&&attr.initializer)attrs[attr.name.text]=ts.isStringLiteral(attr.initializer)?attr.initializer.text:ts.isJsxExpression(attr.initializer)?literal(attr.initializer.expression):undefined;
      const tag=node.tagName.getText(source);
      if(["input","textarea","select"].includes(tag)){
        const controlled=node.attributes.properties.find(attr=>ts.isJsxAttribute(attr)&&["value","checked"].includes(attr.name.text));
        const field=controlled?.getText(source).match(/\bdata\.([a-zA-Z][a-zA-Z0-9]*)/)?.[1];
        if(field){attrs.field=field;attrs.label=attrs["aria-label"]||literal(bindings.get("labels"))?.[field]||field;}
      }
      if(typeof attrs.field==="string"&&tag!=="ErrorMessage"){
        const conditions=[];let step;
        for(let parent=node.parent;parent;parent=parent.parent)if(ts.isBinaryExpression(parent)&&parent.operatorToken.kind===ts.SyntaxKind.AmpersandAmpersandToken){const condition=parent.left.getText(source);const match=condition.match(/^step === (\d)$/);if(match)step=Number(match[1]);else if(condition.includes("data."))conditions.push(condition);}
        if(step!==undefined)result.push({step,tag,...attrs,conditions:conditions.reverse()});
      }
    }
    ts.forEachChild(node,visit);
  }visit(source);
  return result;
}
if(process.argv[1]?.endsWith("audit-onboarding-fields.mjs"))process.stdout.write(JSON.stringify(await auditOnboardingFields(),null,2));
