import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EnviarTfc } from './enviar-tfc';

describe('EnviarTfc', () => {
  let component: EnviarTfc;
  let fixture: ComponentFixture<EnviarTfc>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EnviarTfc],
    }).compileComponents();

    fixture = TestBed.createComponent(EnviarTfc);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
