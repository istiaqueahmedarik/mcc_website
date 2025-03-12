'use client'
export const cropBase64Image = async (bbox, base64Image) => {
    const [x, y, width, height] = JSON.parse(bbox);

    console.log(x, y, width, height)

    const img = new Image();

    await new Promise((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = (err) => reject(err);
        img.src = base64Image;
    });

    const canvas = document.createElement("canvas");
    canvas.width = width - x;
    canvas.height = height - y;

    const ctx = canvas.getContext("2d");

    if (ctx) {

        ctx.drawImage(img, x, y, width - x, height - y, 0, 0, width - x, height - y);

        return canvas.toDataURL("image/jpeg");
    }

    return base64Image;
};


export const imageToBase64 = async (file) => {
    return new Promise < string > ((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            resolve(reader.result);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}