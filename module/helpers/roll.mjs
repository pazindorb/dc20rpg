
export function rollFlavor(imageSrc, label) {
  return `
        <div>
        <img src="${imageSrc}" style="width: 50px; height: 50px; float:left; margin: 0 5px 5px 0"/> 
        <h1>${label}</h1>
        </div>
        `;
}