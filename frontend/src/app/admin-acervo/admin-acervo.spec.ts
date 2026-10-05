import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AdminAcervo } from './admin-acervo';

describe('AdminAcervo', () => {
  let component: AdminAcervo;
  let fixture: ComponentFixture<AdminAcervo>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminAcervo],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminAcervo);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
