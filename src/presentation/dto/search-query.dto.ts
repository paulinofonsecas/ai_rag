import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class SearchQueryDto {
    @IsString()
    @Transform(({ value }: { value: string }) => value?.trim())
    q!: string;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(100)
    limit?: number;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(0)
    offset?: number;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(1000)
    rrfK?: number;

    @IsOptional()
    @Transform(({ value }: { value: string | boolean }) => {
        if (typeof value === 'boolean') {
            return value;
        }

        return value === 'true';
    })
    @IsBoolean()
    rerank?: boolean;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(100)
    rerankCandidates?: number;
}
