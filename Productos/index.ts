import {IInputs, IOutputs} from "./generated/ManifestTypes";
import DataSetInterfaces = ComponentFramework.PropertyHelper.DataSetApi;
type DataSet = ComponentFramework.WebApi.Entity;

export class ProjectProductsManager implements ComponentFramework.StandardControl<IInputs, IOutputs> {

    private _context: ComponentFramework.Context<IInputs>;
    private _container: HTMLDivElement;
    private _leftPanel: HTMLDivElement;
    private _rightPanel: HTMLDivElement;
    private _versionElement: HTMLDivElement;

    // Estado seleccionado
    private _selectedProductId: string | null = null;
    private _selectedProductEstimatedQty: number = 0;
    
    private readonly VERSION = "v0.0.4";

    // =======================================================================
    // NOMBRES LÓGICOS ACTUALIZADOS SEGÚN FETCHXML
    // =======================================================================
    private readonly LOGICAL_NAME_NOMBRE_PADRE = "sec_nombre"; 
    private readonly LOGICAL_NAME_NOMBRE_HIJO = "sec_name"; 
    private readonly LOGICAL_NAME_CANTIDAD_ESTIMADA = "sec_cantidadestimada"; 
    private readonly LOGICAL_NAME_LINEA_ENTIDAD = "sec_lineadeproductodeproyecto"; 
    private readonly LOGICAL_NAME_LOOKUP_PRODUCTO = "sec_productodeproyectoid"; 
    private readonly LOGICAL_NAME_ENTIDAD_PADRE_PLURAL = "sec_productodeproyectos"; // <- Necesario para odata.bind
    // =======================================================================

    constructor() {}

    public init(context: ComponentFramework.Context<IInputs>, notifyOutputChanged: () => void, state: ComponentFramework.Dictionary, container: HTMLDivElement): void {
        this._context = context;
        this._container = container;

        this._container.className = "pcf-main-container";

        this._leftPanel = document.createElement("div");
        this._leftPanel.className = "pcf-left-panel";

        this._rightPanel = document.createElement("div");
        this._rightPanel.className = "pcf-right-panel";
        
        this._versionElement = document.createElement("div");
        this._versionElement.className = "pcf-version";
        this._versionElement.innerText = this.VERSION;

        this._container.appendChild(this._leftPanel);
        this._container.appendChild(this._rightPanel);
        this._container.appendChild(this._versionElement);
    }

    public updateView(context: ComponentFramework.Context<IInputs>): void {
        this._context = context;
        const dataset = context.parameters.projectProductsDataset;

        if (dataset.loading) {
            return;
        }

        this.renderLeftPanel(dataset);
    }

    private renderLeftPanel(dataset: ComponentFramework.PropertyTypes.DataSet): void {
        this._leftPanel.innerHTML = ""; 

        const title = document.createElement("h3");
        title.innerText = "Productos de Proyecto";
        this._leftPanel.appendChild(title);

        dataset.sortedRecordIds.forEach(recordId => {
            const record = dataset.records[recordId];

            const nombre = record.getFormattedValue(this.LOGICAL_NAME_NOMBRE_PADRE) || "Sin nombre";
            const cantidadEstimadaStr = record.getValue(this.LOGICAL_NAME_CANTIDAD_ESTIMADA);
            const cantidadEstimada = cantidadEstimadaStr ? parseInt(cantidadEstimadaStr as string, 10) : 0;

            const card = document.createElement("div");
            card.className = "pcf-card";
            if (this._selectedProductId === recordId) {
                card.classList.add("selected");
            }

            const cardTitle = document.createElement("div");
            cardTitle.className = "pcf-card-title";
            cardTitle.innerText = nombre;

            const cardQty = document.createElement("div");
            cardQty.className = "pcf-card-qty";
            cardQty.innerText = `Cantidad estimada: ${cantidadEstimada}`;

            card.appendChild(cardTitle);
            card.appendChild(cardQty);

            card.onclick = () => {
                this._selectedProductId = recordId;
                this._selectedProductEstimatedQty = cantidadEstimada;
                this.renderLeftPanel(dataset); 
                this.loadRightPanel();
            };

            this._leftPanel.appendChild(card);
        });
    }

    private loadRightPanel(): void {
        this._rightPanel.innerHTML = "Cargando líneas...";

        if (!this._selectedProductId) {
            this._rightPanel.innerHTML = "Seleccione un producto para ver sus líneas.";
            return;
        }

        const query = `?$filter=_${this.LOGICAL_NAME_LOOKUP_PRODUCTO}_value eq ${this._selectedProductId} and statecode eq 0`;

        this._context.webAPI.retrieveMultipleRecords(this.LOGICAL_NAME_LINEA_ENTIDAD, query).then(
            (response) => {
                this.renderRightPanel(response.entities);
            },
            (error) => {
                console.error("Error al recuperar líneas", error);
                this._rightPanel.innerHTML = "Error al cargar las líneas.";
            }
        );
    }

    private renderRightPanel(lineas: any[]): void {
        this._rightPanel.innerHTML = "";

        const title = document.createElement("h3");
        title.innerText = "Líneas de Producto Asociadas";
        this._rightPanel.appendChild(title);

        const list = document.createElement("ul");
        list.className = "pcf-lines-list";

        lineas.forEach(linea => {
            const li = document.createElement("li");
            li.innerText = linea[this.LOGICAL_NAME_NOMBRE_HIJO] || `ID: ${linea[this.LOGICAL_NAME_LINEA_ENTIDAD + "id"]}`;
            list.appendChild(li);
        });

        this._rightPanel.appendChild(list);

        const count = lineas.length;
        const status = document.createElement("div");
        status.className = "pcf-status";
        status.innerText = `Líneas actuales: ${count} / Estimadas: ${this._selectedProductEstimatedQty}`;
        this._rightPanel.appendChild(status);

        if (count < this._selectedProductEstimatedQty) {
            const btnCreate = document.createElement("button");
            btnCreate.className = "pcf-btn-create";
            btnCreate.innerText = "Crear Línea de Producto";
            btnCreate.onclick = () => this.createProductLine();
            this._rightPanel.appendChild(btnCreate);
        }
    }

    private createProductLine(): void {
        if (!this._selectedProductId) return;

        const data: any = {};
        
        data[`${this.LOGICAL_NAME_LOOKUP_PRODUCTO}@odata.bind`] = `/${this.LOGICAL_NAME_ENTIDAD_PADRE_PLURAL}(${this._selectedProductId})`;
        data[this.LOGICAL_NAME_NOMBRE_HIJO] = "Nueva línea generada";

        this._context.webAPI.createRecord(this.LOGICAL_NAME_LINEA_ENTIDAD, data).then(
            (response) => {
                this.loadRightPanel();
            },
            (error) => {
                console.error("Error al crear la línea", error);
                alert("Error al crear la línea. Revisa la consola.");
            }
        );
    }

    public getOutputs(): IOutputs {
        return {};
    }

    public destroy(): void {
    }
}