export class Product {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly description: string,
    public readonly category: string,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
    public readonly embedding?: number[],
  ) {}
}
