import { ArtifactService, ChatService, MessageParserService, ProductEmbedService, ProductSearchService } from './chat.service';

describe('ChatService', () => {
    it('should be defined', () => {
        expect(new ChatService()).toBeDefined();
    });
});

describe('ProductSearchService', () => {
    it('should be defined', () => {
        expect(new ProductSearchService()).toBeDefined();
    });
});

describe('MessageParserService', () => {
    it('should be defined', () => {
        expect(new MessageParserService()).toBeDefined();
    });
});

describe('ProductEmbedService', () => {
    it('should be defined', () => {
        expect(new ProductEmbedService()).toBeDefined();
    });
});

describe('ArtifactService', () => {
    it('should be defined', () => {
        expect(new ArtifactService()).toBeDefined();
    });
});
