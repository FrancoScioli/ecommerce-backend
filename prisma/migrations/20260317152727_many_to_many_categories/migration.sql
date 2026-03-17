-- Crear tabla join
CREATE TABLE "_CategoryToProduct" (
    "A" INTEGER NOT NULL,  -- categoryId
    "B" INTEGER NOT NULL   -- productId
);

-- Migrar relaciones existentes
INSERT INTO "_CategoryToProduct" ("A", "B")
SELECT "categoryId", "id" FROM "Product";

-- Índices requeridos por Prisma
CREATE UNIQUE INDEX "_CategoryToProduct_AB_unique" ON "_CategoryToProduct"("A", "B");
CREATE INDEX "_CategoryToProduct_B_index" ON "_CategoryToProduct"("B");

-- Agregar foreign keys
ALTER TABLE "_CategoryToProduct"
    ADD CONSTRAINT "_CategoryToProduct_A_fkey" FOREIGN KEY ("A") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "_CategoryToProduct"
    ADD CONSTRAINT "_CategoryToProduct_B_fkey" FOREIGN KEY ("B") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Eliminar la FK vieja
ALTER TABLE "Product" DROP COLUMN "categoryId";