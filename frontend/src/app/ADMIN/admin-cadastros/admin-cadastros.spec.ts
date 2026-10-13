import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AdminCadastros } from './admin-cadastros';

describe('AdminCadastros', () => {
  let component: AdminCadastros;
  let fixture: ComponentFixture<AdminCadastros>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminCadastros],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminCadastros);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
